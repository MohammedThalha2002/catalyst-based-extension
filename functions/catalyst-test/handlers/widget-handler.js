"use strict";

import Cliq from "zcatalyst-integ-cliq";
const widget = Cliq.widget();

const tabsArr = [{ label: "My Products", id: "myproducts" }];

widget.viewHandler(async (req, res, app) => {
  const userId = req?.access?.organization?.id;
  const page = 1;
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
    return showError(res);
  }
});

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
