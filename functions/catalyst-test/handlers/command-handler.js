"use strict";
import cliq from "zcatalyst-integ-cliq";
const command = cliq.command();

command.executionHandler(async (req, res, app) => {
  const commandName = req.name;
  if (comp(commandName, "authorize")) {
    return authorize();
  } else if (comp(commandName, "myproducts")) {
    return await myProducts(req, res, app);
  } else if (comp(commandName, "newproduct")) {
    return newProductForm();
  }
});

function comp(var1, var2) {
  return var1.toUpperCase() === var2.toUpperCase();
}

function authorize() {
  return {
    bot: {
      name: "Amazon Tracker - TEST",
      image: "https://i.postimg.cc/KcKstCmd/logo.png",
    },
    slides: [
      {
        type: "text",
        title: "*Authentication Required* 🔐",
        buttons: [
          {
            label: "Authenticate",
            type: "+",
            action: {
              type: "invoke.function",
              data: {
                name: "authentication",
              },
              confirm: {
                title: "Generate Webhooks for Amazon Tracker",
                description: "Connect to Amazon Tracker from within Cliq",
                input: {
                  type: "user_webhook_token",
                },
              },
            },
          },
        ],
        data: "⚠️You haven't authorized the application yet. Authorize to get the notifications on price drop📦 ",
      },
    ],
    text: "🚨🚨🚨🚨🚨",
  };
}

async function myProducts(req, res, app) {
  const limit = 10;
  const userId = req?.access?.organization?.id;

  const zcql = app.zcql();

  const dataQuery = userId
    ? `SELECT * FROM Track WHERE userId = '${userId}' LIMIT ${limit};`
    : `SELECT * FROM Track;`;

  try {
    let dataRes = await zcql.executeZCQLQuery(dataQuery);

    // alter dataRes
    dataRes = dataRes.map((item) => item.Track);
    dataRes.forEach((item) => delete item.Track);

    let count = 1;
    const slidesList = [];
    const tracks = dataRes;

    if (tracks.length > 0) {
      for (const track of tracks) {
        const id = track.ROWID;
        let title = track.title.toString();
        if (title.length > 95) {
          title = title.substring(0, 90) + "...";
        }
        const curr_price = track.curr_price;
        const exp_price = track.exp_price;
        const track_url = track.url;

        const slidesList1 = {
          type: "label",
          title: `${count}. ${title}`,
          buttons: [
            {
              label: "Url",
              action: {
                type: "open.url",
                data: {
                  web: track_url,
                },
              },
            },
            {
              label: "Update",
              type: "+",
              action: {
                type: "invoke.function",
                data: {
                  name: "updatePrice",
                },
              },
              key: id,
            },
            {
              label: "Delete",
              type: "-",
              action: {
                type: "invoke.function",
                data: {
                  name: "deleteProduct",
                },
              },
              key: id,
            },
            {
              label: "More..",
              action: {
                type: "invoke.function",
                data: {
                  name: "productInfo",
                },
              },
              key: id,
            },
          ],
          data: [
            { "💸Current Price": `₹${curr_price}` },
            { "💵Expected Price": `₹${exp_price}` },
          ],
        };

        slidesList.push(slidesList1);
        count++;
      }

      res.bot = {
        name: "Amazon Tracker",
        image: "https://i.postimg.cc/KcKstCmd/logo.png",
      };
      res.slides = slidesList;
      res.text = "Your Products 📦";
      return res;
    } else {
      res.text =
        "No tracked products found! 😕\nIt seems like you haven't added any Amazon products to track yet. To get started, use the /newproduct command to add a product or visit the Amazon website to find items you'd like to monitor. 🛍️✨";
      return res;
    }
    //
  } catch (error) {
    console.log(error);
    res.text = "SOmething went wrong";
    return res;
  }
}

function newProductForm() {
  return {
    type: "form",
    title: "Amazon Tracker TEST",
    name: "track-input-form",
    hint: "Track the prices of your favorite Amazon products with our Price Tracker Form!",
    button_label: "Submit",
    inputs: [
      {
        name: "url",
        label: "Product URL",
        placeholder: "https://",
        hint: "Enter the Amazon product URL you want to track",
        min_length: "0",
        max_length: "1000",
        mandatory: true,
        type: "text",
        format: "url",
      },
      {
        name: "price",
        label: "Expected price",
        placeholder: "1200",
        hint: "Set the price at which you'd like to be notified",
        min: "0",
        max: "100000",
        mandatory: true,
        type: "number",
      },
    ],
    action: {
      type: "invoke.function",
      name: "posttrackform",
    },
  };
}
