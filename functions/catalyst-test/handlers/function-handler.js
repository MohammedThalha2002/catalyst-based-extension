"use strict";
import Cliq from "zcatalyst-integ-cliq";
import axios from "axios";
import cheerio from "cheerio";
const functionHandler = Cliq.CliqFunction();

functionHandler.buttonFunctionHandler(async (req, res, app) => {
  const functionName = req.name;
  if (comp(functionName, "authentication")) {
    return await authentication(req, res, app);
  } else if (comp(functionName, "updatePrice")) {
    return updatePrice(req, res);
  } else if (comp(functionName, "deleteProduct")) {
    return await deleteProduct(req, res, app);
  } else if (comp(functionName, "productInfo")) {
    return await productInfo(req, res, app);
  } else if (comp(functionName, "enableORdisable")) {
    return await enableORdisable(req, res, app);
  }
});

functionHandler.formSubmitHandler(async (req, res, app) => {
  const formFunctionName = req.name;
  const values = req.form.values;

  if (comp(formFunctionName, "posttrackform")) {
    const url = values.url;
    const userId = req?.access?.organization?.id;
    const exp_price = values.price;
    return await scrape(url, userId, exp_price, req, res, app);
  } else if (comp(formFunctionName, "updatePriceForm")) {
    const id = req.form.name;
    const exp_price = values.exp_price;
    return await updatePriceForm(exp_price, id, req, res, app);
  }
});

functionHandler.widgetButtonHandler(async (req, res, app) => {
  const functionName = req.name;
  if (comp(functionName, "WIDGETaddProduct")) {
    return WIDGETaddProduct();
  } else if (comp(functionName, "WIDGETdeleteProduct")) {
    return await WIDGETdeleteProduct(req, res, app);
  } else if (comp(functionName, "WIDGETupdatePrice")) {
    return WIDGETupdatePrice(req);
  } else if (comp(functionName, "WIDGETenORdi")) {
    return WIDGETenableORdiableTracking(req, res, app);
  } else if (comp(functionName, "WIDGETnavigate")) {
    return WIDGETnavigate(req, res, app);
  }
});

function comp(var1, var2) {
  return var1.toUpperCase() === var2.toUpperCase();
}

async function authentication(req, res, app) {
  const userId = req?.access?.organization?.id;
  const token = req?.arguments?.input?.token;
  const zcql = app.zcql();
  let query = `select * from users where userId = '${userId}'`;
  let queryRes = await zcql.executeZCQLQuery(query);
  // user already exists
  if (queryRes.length > 0) {
    const result = queryRes[0].Users;
    const updateQuery = `
        UPDATE Users
        SET token = '${token}'
        WHERE ROWID = ${result.ROWID};`;
    try {
      await zcql.executeZCQLQuery(updateQuery);
      return successBanner(res, "Authorized successfully🔥");
    } catch (error) {
      return failureBanner(res, "Something went wrong 😓");
    }
  } else {
    // create new user
    const insertQuery = `
        INSERT INTO Users (token, userId)
        VALUES ('${token}', '${userId}')`;
    try {
      await zcql.executeZCQLQuery(insertQuery);
      return successBanner(res, "Authorized successfully🔥");
    } catch (error) {
      return failureBanner(res, "Something went wrong 😓");
    }
  }
}

async function scrape(url, userId, exp_price, req, res, app) {
  try {
    await getHTML(url).then(async (html) => {
      const $ = cheerio.load(html);
      let curr_price = $(".a-price-whole").text();
      curr_price = curr_price.replace(/,/g, "");
      curr_price = parseInt(curr_price);
      if (exp_price > curr_price) {
        console.log("The exp price is already greater than the curr price");
        //
        res.type = "form_error";
        res.text =
          "The Expected price should not be greater than the current price";
        res.inputs = {
          price: "Expected price is higher than the current price",
        };
        return res;
      }
      let title = $("#productTitle")
        .text()
        .trim()
        .replace(/[|&;$%@"<>()+,]/g, "");
      if (title.length > 100) {
        if (title.includes(",")) {
          title = title.split(",")[0];
        } else {
          title = title.substring(0, 90) + "...";
        }
      }
      let features = [];
      $("#feature-bullets>ul>li").each((i, desc) => {
        if (i < 2) {
          features.push(
            $(desc)
              .text()
              .trim()
              .replace(/[|&;$%@"<>()+,]/g, "")
              .substring(0, 95) + "..."
          );
        }
      });
      let imgUrl = $("#imgTagWrapperId>img").attr("src");
      let inStock =
        $("#availability>span").text().trim() == "In stock" ? true : false;
      let rating = parseFloat($("#acrPopover>span>a>span").text().trim());

      const data = {
        url: url,
        title: title,
        features: features,
        imgUrl: imgUrl,
        inStock: inStock,
        rating: rating,
        exp_price: exp_price,
        curr_price: curr_price,
        userId: userId,
      };
      console.log("NEW RESULT");
      console.log(data);

      //
      if (userId) {
        let zcql = app.zcql();

        let query = `INSERT INTO Track (url, title, features, img_url, inStock, rating, exp_price, curr_price, userId)
                    VALUES ('${url}', '${title}', '${JSON.stringify(
          features
        )}', '${imgUrl}', ${inStock}, ${rating}, ${exp_price}, ${curr_price}, '${userId}')`;

        await zcql.executeZCQLQuery(query);
      }
      console.log("Added successfully");
    });
    return successBanner(res, "Product Added Successfully");
  } catch (error) {
    console.log(error);
    return failureBanner(res, "Something went wrong 😓");
    // console.log("Failed to fetch the data from the url");
    // const data = {
    //   url: url,
    //   title: "Updating...",
    //   features: ["Updating...", "Updating..."],
    //   imgUrl:
    //     "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/310px-Placeholder_view_vector.svg.png",
    //   inStock: true,
    //   rating: 0.0,
    //   exp_price: exp_price,
    //   curr_price: 0.0,
    //   email: email,
    // };
    // res.status(200).json({
    //   msg: "Failed to upload the tracking data",
    //   error: error,
    //   status: "error",
    //   data: data,
    // });
  }
}

const getHTML = async (url) => {
  const { data: html } = await axios.get(url);
  return html;
};

function updatePrice(req) {
  const id = req?.arguments?.key;
  const form = {
    type: "form",
    title: "Product Update Form",
    name: id,
    hint: "Update your new expected price",
    button_label: "Submit",
    inputs: [
      {
        name: "exp_price",
        label: "Expected Price",
        placeholder: "Enter your new expected price",
        min: "0",
        max: "100000",
        mandatory: true,
        type: "number",
      },
    ],
    action: {
      type: "invoke.function",
      name: "updatePriceForm",
    },
  };
  return form;
}

async function updatePriceForm(exp_price, id, req, res, app) {
  const zcql = app.zcql();
  const updateQuery = `
      UPDATE Track
      SET exp_price = ${exp_price}
      WHERE ROWID = '${id}';
    `;

  try {
    await zcql.executeZCQLQuery(updateQuery);
    console.log(exp_price, "updated successfully");
    return successBanner(res, "Price updated successfully");
  } catch (error) {
    return failureBanner(res, "Failed to update the price");
  }
}

async function deleteProduct(req, res, app) {
  const id = req?.arguments?.key;
  const zcql = app.zcql();

  const deleteQuery = `
      DELETE FROM Track
      WHERE ROWID = '${id}';
    `;

  try {
    await zcql.executeZCQLQuery(deleteQuery);
    console.log("Deleted successfully");
    return successBanner(res, "Product Deleted successfully");
  } catch (error) {
    return failureBanner(res, "Failed to delete the product");
  }
}

async function productInfo(req, res, app) {
  const id = req?.arguments?.key;
  const zcql = app.zcql();

  const dataQuery = `SELECT * FROM Track WHERE ROWID = '${id}';`;

  try {
    let dataRes = await zcql.executeZCQLQuery(dataQuery);
    console.log(dataRes);
    // alter dataRes
    dataRes = dataRes.map((item) => item.Track);
    dataRes.forEach((item) => delete item.Track);

    const trackData = dataRes[0];

    const inStock = trackData.inStock ? "IN STOCK" : "OUT OF STOCK";
    const rating = trackData.rating;
    let stars = "";

    for (let i = 0; i < rating; i++) {
      stars += "⭐";
    }

    const features = JSON.parse(trackData.features) || [];
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

    const tracking = trackData.track_enabled;
    const trackBtnLabel = tracking ? "Disable" : "Enable";
    const trackBtnID = tracking ? `disable${id}` : `enable${id}`;

    res.text = "Product Info";
    res.navigation = true;
    res.bot = {
      name: "Amazon Tracker",
      image: "https://i.postimg.cc/KcKstCmd/logo.png",
    };
    res.slides = [
      {
        type: "images",
        title: trackData.title,
        data: [trackData.img_url],
      },
      {
        type: "label",
        title: inStock,
        data: [
          { "💸Current Price": `₹${trackData.curr_price}` },
          { "💵Expected Price": `₹${trackData.exp_price}` },
        ],
      },
      {
        type: "text",
        title: `Rating : ${rating}`,
        data: stars,
      },
      {
        type: "list",
        title: "Features",
        buttons: [
          {
            label: "Url",
            hint: "",
            action: { type: "open.url", data: { web: trackData.url } },
          },
          {
            label: "Update",
            hint: "",
            type: "+",
            action: {
              type: "invoke.function",
              data: { name: "updatePrice" },
            },
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
    ];
    return res;
  } catch (error) {
    console.log(error);
    return failureBanner(res, "Failed");
  }
}

async function enableORdisable(req, res, app) {
  const key = req?.arguments?.key;
  const zcql = app.zcql();
  let updateQuery = "";
  if (key.includes("disable")) {
    const id = key.split("disable").pop();
    updateQuery = `
      UPDATE Track
      SET track_enabled = false
      WHERE ROWID = '${id}';
    `;
  } else if (key.includes("enable")) {
    const id = key.split("enable").pop();
    updateQuery = `
      UPDATE Track
      SET track_enabled = true
      WHERE ROWID = '${id}';
    `;
  }
  try {
    await zcql.executeZCQLQuery(updateQuery);
    return successBanner(res, "Tracking details updated");
  } catch (error) {
    console.log(error);
    return failureBanner(res, "Something went wrong");
  }
}

// WIDGET FUNCTIONS

function WIDGETaddProduct() {
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

async function WIDGETdeleteProduct(req, res, app) {
  const id = req.target?.id;

  const zcql = app.zcql();

  const deleteQuery = `
      DELETE FROM Track
      WHERE ROWID = '${id}';
    `;

  try {
    await zcql.executeZCQLQuery(deleteQuery);
    console.log("Deleted successfully");
    return await showWidgetPage(req, res, app);
  } catch (error) {
    console.log(error);
    return failureBanner(res, "Failed to delete the product");
  }
}

function WIDGETupdatePrice(req) {
  const id = req.target?.id;
  const form = {
    type: "form",
    title: "Product Update Form",
    name: id,
    hint: "Update your new expected price",
    button_label: "Submit",
    inputs: [
      {
        name: "exp_price",
        label: "Expected Price",
        placeholder: "Enter your new expected price",
        min: "0",
        max: "100000",
        mandatory: true,
        type: "number",
      },
    ],
    action: {
      type: "invoke.function",
      name: "updatePriceForm",
    },
  };
  return form;
}

async function WIDGETenableORdiableTracking(req, res, app) {
  const key = req.target?.id;
  const zcql = app.zcql();
  let updateQuery = "";
  if (key.includes("disable")) {
    const id = key.split("disable").pop();
    updateQuery = `
      UPDATE Track
      SET track_enabled = false
      WHERE ROWID = '${id}';
    `;
  } else if (key.includes("enable")) {
    const id = key.split("enable").pop();
    updateQuery = `
      UPDATE Track
      SET track_enabled = true
      WHERE ROWID = '${id}';
    `;
  }
  try {
    await zcql.executeZCQLQuery(updateQuery);
    return await showWidgetPage(req, res, app);
  } catch (error) {
    console.log(error);
    return failureBanner(res, "Something went wrong");
  }
}

async function WIDGETnavigate(req, res, app) {
  const key = req.target?.id;
  let currPage = 1;
  if (key.includes("prev_")) {
    currPage = key.split("prev_").pop();
  } else {
    currPage = key.split("next_").pop();
  }
  currPage = parseInt(currPage);
  return await showWidgetPage(req, res, app, currPage);
}

// SHOW WIDGET STARTING PAGE
async function showWidgetPage(req, res, app, currPage) {
  const tabsArr = [
    { label: "My Products" + currPage ? currPage : "", id: "myproducts" },
  ];
  const userId = req?.access?.organization?.id;
  const page = currPage || 1;
  const limit = 3;
  const offset = (page - 1) * limit + 1;

  const dataQuery = `SELECT * FROM Track WHERE userId = '${userId}' LIMIT ${limit} OFFSET ${offset};`;
  const countQuery = `SELECT COUNT(ROWID) FROM Track WHERE userId = '${userId}';`;

  let zcql = app.zcql();

  try {
    let docs = await zcql.executeZCQLQuery(dataQuery);
    const countResults = await zcql.executeZCQLQuery(countQuery);
    //
    const totalCount = countResults[0].Track.ROWID;
    // console.log(totalCount);
    const hasNextPage = page * limit < totalCount;
    const hasPrevPage = page > 1;

    const meta = {
      page: page,
      hasPrevPage: hasPrevPage,
      hasNextPage: hasNextPage,
    };
    // alter docs
    docs = docs.map((item) => item.Track);
    docs.forEach((item) => delete item.Track);
    const tracks = docs;

    // sections
    const sections = [{ id: 1, elements: [] }];
    // adding elements
    let count = (meta.page - 1) * limit + 1;
    tracks.forEach((track) => {
      const title =
        track.title.length > 95
          ? `${track.title.substring(0, 90)}...`
          : track.title;
      const features =
        JSON.parse(track.features) && JSON.parse(track.features).length > 0
          ? JSON.parse(track.features)[0]
          : "Highly recommended to anyone in search of high-quality product with top-notch features.";

      const element = {
        type: "title",
        text: `${count}. ${title}`,
      };

      sections[0].elements.push(element);

      sections[0].elements.push({
        type: "subtext",
        text: `📦${features}`,
      });

      sections[0].elements.push({
        type: "text",
        text: `*💸Curr Price* : ₹${track.curr_price}\n*💵Exp Price* : ₹${track.exp_price}`,
      });

      const buttons = [
        {
          label: "Update",
          type: "invoke.function",
          name: "WIDGETupdatePrice",
          id: `${track.ROWID}`,
          emotion: "positive",
        },
        {
          label: "Delete",
          type: "invoke.function",
          name: "WIDGETdeleteProduct",
          id: `${track.ROWID}`,
          emotion: "negative",
        },
        {
          label: track.track_enabled ? "Disable" : "Enable",
          type: "invoke.function",
          name: "WIDGETenORdi",
          id: `${track.track_enabled ? "disable" : "enable"}${track.ROWID}`,
          emotion: track.track_enabled ? "negative" : "positive",
        },
      ];

      sections[0].elements.push({
        type: "buttons",
        buttons: buttons,
      });

      sections[0].elements.push({
        type: "divider",
      });

      count++;
    });

    // HEADER PART
    const header = {
      title: "My Products",
      navigation: "new",
      buttons: [
        {
          label: "Add Product",
          type: "invoke.function",
          name: "WIDGETaddProduct",
          id: "section",
          emotion: "positive",
        },
      ],
    };
    // FOOTER PART
    const footer = {};
    if (meta.hasPrevPage || meta.hasNextPage) {
      const buttons = [];
      if (meta.hasPrevPage) {
        const newPage = meta.page - 1;
        buttons.push({
          label: "◀️ Prev",
          type: "invoke.function",
          name: "WIDGETnavigate",
          id: `prev_${newPage}`,
          emotion: "positive",
        });
      }
      if (meta.hasNextPage) {
        const newPage = meta.page + 1;
        buttons.push({
          label: "Next ▶️",
          type: "invoke.function",
          name: "WIDGETnavigate",
          id: `next_${newPage}`,
          emotion: "positive",
        });
      }
      footer.buttons = buttons;
    }
    //
    const response = {
      type: "applet",
      header: header,
      tabs: tabsArr,
      active_tab: "myproducts",
      sections: sections,
      footer: footer,
    };
    return {
      ...res,
      ...response,
    };
  } catch (error) {
    // show error
    console.log("error in widget", error);
    return showError(res);
  }
}

function showError(res) {
  const errorPageRes = {
    type: "applet",
    data_type: "info",
    tabs: tabsArr,
    info: {
      title: "Something went wrong 😔",
      description: "Reload the page to fix the error",
      image_url:
        "https://cdn.dribbble.com/users/1078347/screenshots/2799566/oops.png",
    },
    active_tab: "myproducts",
  };

  const result = {
    ...res,
    ...errorPageRes,
  };
  return result;
}

// COMMON - BANNERS

function successBanner(res, message) {
  res.text = message;
  res.status = "success";
  res.type = "banner";
  return res;
}

function failureBanner(res, message) {
  res.text = message;
  res.status = "failure";
  res.type = "banner";
  return res;
}
