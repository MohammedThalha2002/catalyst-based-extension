const axios = require("axios");
const catalyst = require("zcatalyst-sdk-node");

module.exports = async (cronDetails, context) => {
  var app = catalyst.initialize(context);
  let zcql = app.zcql();

  // find all users
  let query = `select * from Users`;
  try {
    let queryRes = await zcql.executeZCQLQuery(query);

    for (const user of queryRes) {
      await fetchTracks(zcql, user[0].Users);
    }
  } catch (error) {
    console.log(error);
  }

  // iterate through al the users and find their respective tracks

  // send the tracks

  context.closeWithSuccess();
};

async function fetchTracks(zcql, user) {
  // fetching all the tracks related to that user
  const dataQuery = `SELECT * FROM Track WHERE userId = '${user.userId}';`;
  try {
    let dataRes = await zcql.executeZCQLQuery(dataQuery);
    // alter dataRes
    dataRes = dataRes.map((item) => item.Track);
    dataRes.forEach((item) => delete item.Track);
    //
    const tracks = dataRes;

    const rows = [];

    if (tracks.length > 0) {
      for (const track of tracks) {
        const row = {};
        let title = track.title.toString();

        // Truncate title if longer than 95 characters
        if (title.length > 95) {
          title = title.substring(0, 90) + "...";
        }

        const curr_price = track.curr_price;
        const exp_price = track.exp_price;
        const trackUrl = track.url;

        let status = track.track_enabled ? "enabled" : "disabled";

        row["Title"] = title;
        row["Current Price"] = "₹" + curr_price;
        row["Expected Price"] = "₹" + exp_price;
        row["Track Status"] = status;
        row["Url"] = "[link](" + trackUrl + ")";

        rows.push(row);
      }

      const greetings =
        "! Good Morning🌞!\nReady to make today amazing😉? Don't forget to check out the latest deals waiting for you today.\nYour favorite items may be just a click away.";

      const bot = {
        name: "Amazon Tracker",
        image: "https://i.postimg.cc/KcKstCmd/logo.png",
      };

      const message = {
        text: "Hey " + greetings,
        bot: bot,
        slides: [
          {
            type: "table",
            title: "",
            data: {
              headers: [
                "Title",
                "Current Price",
                "Expected Price",
                "Track Status",
                "Url",
              ],
              rows: rows,
            },
          },
        ],
      };

      // send to the bot
      postToTrackazonBot(user.token, message);
    }
  } catch (error) {
    console.log(error);
  }
}

async function postToTrackazonBot(token, response) {
  const webhookUrl = `https://cliq.zoho.com/api/v2/bots/testingbot/message?zapikey=${token}&appkey=sbx-NTQ3Ny0zZjBiNGQ4Ny01ZmQyLTQxOWItYTQ3OS0zNmRkZTAzOWRkMWQ=`;

  await axios
    .post(webhookUrl, response)
    .then((result) => {
      console.log("POSTED SUCCESSFULLY");
      console.log(result.data);
    })
    .catch((err) => {
      console.log("SCHEDULER FAILED TO POST TO BOT");
      console.log(err);
    });
}
