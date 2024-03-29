"use strict";
import Cliq from "zcatalyst-integ-cliq";
const botHandler = Cliq.bot();

botHandler.welcomeHandler(async (req, res) => {
  res.card = {
    thumbnail:
      "https://images.unsplash.com/photo-1557899563-1940fc95709c?q=80&w=2971&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  };
  res.text =
    "Hey *" +
    req.user.first_name +
    "*! Thank you for subscribing!\n\nWelcome to *Trackazon* an *Amazon Tracker for Zoho Cliq!* 🚀\nYou're now connected to our extension, designed to keep you in the loop about your favorite Amazon products. Here's what you can do:\n\n*⭐ Post your Amazon product links and start tracking their prices.*\n*⭐ View daily morning updates summarizing the status and price details of your tracked products.*\n*⭐ Receive real-time notifications in Zoho Cliq when a product's price drops to your expected price.*\n\nStart by posting a product link, and let the tracking begin! 🛍️\n\nFor detailed instructions and tips, check out our [Documentation](https://billowy-tendency-afc.notion.site/Amazon-Tracker-846cab60878c46acba2a6728a8ac8428).";
  return res;
});

botHandler.menuActionHandler(async (req, res, app) => {
  const actionName = req.action_name;
  if (comp(actionName, "Authorize")) {
    return authorize();
  } else if (comp(actionName, "Add Product")) {
    return newProductForm();
  } else if (comp(actionName, "Show Products")) {
    return await myProducts(req, res, app);
  }
});

botHandler.webHookHandler(async (req, res) => {
  const track = JSON.parse(req.body);
  const id = track.ROWID;
  const title = track.title;
  const img_url = track.img_url;
  const url = track.url;
  const inStock = track.inStock ? "IN STOCK" : "OUT OF STOCK";
  const rating = track.rating;
  let stars = "";

  for (let i = 0; i < rating; i++) {
    stars += "⭐";
  }

  const features = JSON.parse(track.features) || [];
  let feature1 = "The product is extremely satisfied with its performance.";
  let feature2 =
    "Highly recommended to anyone in search of high-quality product with top-notch features.";

  if (features.length > 0) {
    feature1 = features[0].replace(/"/g, "");
    feature1 =
      feature1.length > 99 ? feature1.substring(0, 95) + "..." : feature1;

    feature2 = features[1] ? features[1].replace(/"/g, "") : feature2;
    feature2 =
      feature2.length > 99 ? feature2.substring(0, 95) + "..." : feature2;
  }

  const tracking = track.track_enabled;
  const trackBtnLabel = tracking ? "Disable" : "Enable";
  const trackBtnID = tracking ? `disable${id}` : `enable${id}`;

  const response = {
    text: "🎉 *Great News! Price Drop Alert🤩!*\n🥳Hurrayyyy! Your awaited item is now available. Hurry and grab this exclusive offer before stocks run out.🛍️✨ Happy shopping!",
    bot: {
      name: "Amazon Tracker",
      image: "https://i.postimg.cc/KcKstCmd/logo.png",
    },
    slides: [
      { type: "images", title: title, data: [img_url] },
      {
        type: "label",
        title: inStock,
        data: [
          { "💸Current Price": `₹${track.curr_price}` },
          { "💵Expected Price": `₹${track.exp_price}` },
        ],
      },
      { type: "text", title: "Rating : " + rating, data: stars },
      {
        type: "list",
        title: "Features",
        buttons: [
          {
            label: "Url",
            hint: "",
            action: { type: "open.url", data: { web: url } },
          },
          {
            label: "Update",
            hint: "",
            type: "+",
            action: { type: "invoke.function", data: { name: "updatePrice" } },
            key: id,
          },
          {
            label: "Delete",
            hint: "",
            type: "-",
            action: {
              type: "invoke.function",
              data: { name: "deleteProduct" },
            },
            key: id,
          },
          {
            label: trackBtnLabel,
            hint: "",
            action: {
              type: "invoke.function",
              data: { name: "enableORdisable" },
            },
            key: trackBtnID,
          },
        ],
        data: [feature1, feature2],
      },
    ],
  };
  // we have to post it to the tracker bot
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
