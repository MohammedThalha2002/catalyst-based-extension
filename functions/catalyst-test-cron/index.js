const catalyst = require("zcatalyst-sdk-node");
const cheerio = require("cheerio");
const { default: axios } = require("axios");

module.exports = async (cronDetails, context) => {
  console.log("Hello from index.js");

  var app = catalyst.initialize(req);
  let zcql = app.zcql();

  const dataQuery = `SELECT * FROM Track;`;
  try {
    let dataRes = await zcql.executeZCQLQuery(dataQuery);

    // alter dataRes
    dataRes = dataRes.map((item) => item.Track);
    dataRes.forEach((item) => delete item.Track);

    await cronJob(dataRes, zcql);
  } catch (error) {
    console.log(error);
  }

  context.closeWithSuccess();
};

async function cronJob(details, zcql) {
  console.log("Scraping started");
  for (const detail of details) {
    await findPrice(detail, zcql);
  }
}

async function findPrice(detail, zcql) {
  // url, email, exp_price;
  console.log("-----------------");
  console.log(detail.title);
  const url = detail.url;
  const exp_price = detail.exp_price;
  try {
    await getHTML(url).then(async (html) => {
      const $ = cheerio.load(html);
      let curr_price = $(".a-price-whole").text();
      curr_price = curr_price.replace(/,/g, "");
      curr_price = parseInt(curr_price);
      let inStock = $("#availability>span").text().trim();
      let rating = $("#acrPopover>span>a>span").text().trim();
      console.log(curr_price, inStock, rating);
      // updating the db on price or rating varied
      if (curr_price != detail.curr_price) {
        await updatePriceDetails(detail.ROWID, curr_price, zcql);
      } else {
        console.log("Same price");
      }

      // notify the user on the price drop
      if (curr_price <= detail.exp_price) {
        console.log("price drop alert");
        console.log("Curr Price : ", curr_price);
        console.log("Exp Price : ", exp_price);
        notifyUser(detail, zcql);
      }
    });
  } catch (error) {
    console.log(error.response.statusText);
  }
}

const getHTML = async (url) => {
  const { data: html } = await axios.get(url);
  return html;
};

async function updatePriceDetails(id, curr_price, zcql) {
  const updateQuery = `
		UPDATE Track
		SET curr_price = ${curr_price}
		WHERE ROWID = '${id}';
	  `;

  try {
    await zcql.executeZCQLQuery(updateQuery);
    console.log(curr_price, "price updated successfully");
  } catch (err) {
    console.log(err);
  }
}

async function notifyUser(body, zcql) {
  console.log(body);
  let email = body.email;

  let query = `select * from users where email = '${email}'`;
  let queryRes = await zcql.executeZCQLQuery(query);
  const result = queryRes[0].Users;
  //
  console.log(result.email);
  let userId = result.userId;
  let token = result.token;

  //
  const track = body;
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

  const webhookUrl = `https://cliq.zoho.com/company/${userId}/api/v2/bots/testingbot/message?zapikey=${token}&appkey=sbx-NTQ3Ny0zZjBiNGQ4Ny01ZmQyLTQxOWItYTQ3OS0zNmRkZTAzOWRkMWQ=`;

  //   const sandbox = `https://cliq.zoho.com/company/${userId}/api/v2/applications/2305843009213699174/incoming?appkey=sbx-NTIyMy0yNDAxZDViMi02YTVhLTQyZGUtOWNhYy1hNDc0NDg2NzU5M2Q=`;
  //   const marketplace = `https://cliq.zoho.com/company/${userId}/api/v2/applications/5223/incoming?appkey=NTIyMy0yNDAxZDViMi02YTVhLTQyZGUtOWNhYy1hNDc0NDg2NzU5M2Q=`;
  await axios
    .post(`${webhookUrl}&zapikey=${token}`, response)
    .then((result) => {
      console.log("POSTED SUCCESSFULLY");
      console.log(result.data);
    })
    .catch((err) => {
      console.log("CRON FAILED TO NOTIFY THE USER");
      console.log(err);
    });
}
