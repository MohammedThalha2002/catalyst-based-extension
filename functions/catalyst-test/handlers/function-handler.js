"use strict";
import Cliq from "zcatalyst-integ-cliq";
const functionHandler = Cliq.CliqFunction();

functionHandler.buttonFunctionHandler(async (req, res, app) => {
  const functionName = req.name;
  if (comp(functionName, "authentication")) {
    return await authentication(req, res, app);
  } else if (comp(functionName, "posttrackform")) {
    return await posttrackform(req, res, app);
  }
});

functionHandler.formSubmitHandler(async (req, res) => {
  const formFunctionName = req.name;
  const values = req.form.values;

  if(comp(formFunctionName, "posttrackform")){
    
  }

});

functionHandler.widgetButtonHandler(async (req, res) => {
  const id = req.target.id;
  switch (id) {
    case "tab": {
      res.type = "applet";

      const titleSection = res.newWidgetSection();
      titleSection.id = "100";

      const time = titleSection.newWidgetElement();
      time.type = "subtext";
      time.text =
        "Target:buttons\nTime : " +
        new Date().toISOString().replace("T", " ").replace("Z", "");

      titleSection.addElement(time);
      res.addSection(titleSection, getButtonSection());

      return res;
    }
    case "section": {
      const section = res.newWidgetSection();
      section.id = "102";
      section.type = "section";
      const element = section.newWidgetElement();
      element.type = "title";
      element.text = "Edited :wink: ";

      section.addElement(element);
      return section;
    }
    case "formTab":
    case "formsection": {
      const form = functionHandler.newHandlerResponse().newForm();
      form.title = "Zylker Annual Marathon";
      form.name = "a";
      form.hint = "Register yourself for the Zylker Annual Marathon";
      form.button_label = "Submit";

      const input1 = form.newFormInput();
      input1.type = "text";
      input1.name = "text";
      input1.label = "Name";
      input1.placeholder = "Scott Fischer";
      input1.min_length = "0";
      input1.max_length = "25";
      input1.mandatory = true;

      const input2 = form.newFormInput();
      input2.type = "hidden";
      input2.name = "type";
      input2.value = id;

      form.addInputs(input1, input2);
      form.action = form.newFormAction("appletForm"); // ** ENTER YOUR FORM FUNCTION NAME HERE **
      return form;
    }
    case "breadcrumbs": {
      const page = parseInt(req.target.label.split("Page : ")[1].trim()) + 1;

      const section = res.newWidgetSection();
      section.id = "12345";

      const elem = section.newWidgetElement();
      elem.type = "subtext";
      elem.text = "Page : " + page;
      section.addElement(elem);
      res.addSection(section);

      const firstNav = {
        label: "Page : " + page,
        type: "invoke.function",
        name: "appletFunction",
        id: "breadcrumbs",
      };

      const linkButton = {
        label: "Link",
        type: "open.url",
        url: "https://www.zoho.com",
      };

      const bannerButton = {
        label: "Banner",
        type: "invoke.function",
        name: "appletFunction",
        id: "banner",
      };

      res.header = {
        title: "Header " + page,
        navigation: "continue",
        buttons: [firstNav, linkButton, bannerButton],
      };

      res.footer = {
        text: "Footer text",
        buttons: [linkButton, bannerButton],
      };

      res.type = "applet";
      return res;
    }
    default: {
      const msg = functionHandler.newHandlerResponse().newMessage();
      msg.text = "Applet Button executed successfully";
      msg.type = "banner";
      msg.status = "success";
      return msg;
    }
  }
});

function getButtonSection() {
  const widgetResponse = functionHandler.newWidgetResponse();

  const buttonSection = widgetResponse.newWidgetSection();

  const title = buttonSection.newWidgetElement();
  title.type = "title";
  title.text = "Buttons";

  const buttonElement1 = buttonSection.newWidgetElement();
  buttonElement1.type = "buttons";
  const buttonsList1 = [];

  const button1 = buttonElement1.newWidgetButton();
  button1.label = "link";
  button1.type = "open.url";
  button1.url = "https://www.zoho.com";

  const button2 = buttonElement1.newWidgetButton();
  button2.label = "Banner";
  button2.type = "invoke.function";
  button2.name = "appletFunction";
  button2.id = "banner";

  const button3 = buttonElement1.newWidgetButton();
  button3.label = "Open Channel";
  button3.type = "system.api";
  button3.setApi("joinchannel/{{id}}", "CD_1283959962893705602_14598233"); // ** ENTER YOUR CHANNEL ID HERE **

  const button4 = buttonElement1.newWidgetButton();
  button4.label = "Preview";
  button4.type = "preview.url";
  button4.url = "https://www.zoho.com/catalyst/features.html";

  buttonsList1.push(button1, button2, button3, button4);

  buttonElement1.addWidgetButton(...buttonsList1);

  //Buttons - Row2

  const buttonElement2 = buttonSection.newWidgetElement();
  buttonElement2.type = "buttons";

  const button5 = buttonElement2.newWidgetButton();
  button5.label = "Edit Section";
  button5.type = "invoke.function";
  button5.name = "appletFunction";
  button5.id = "section";

  const button6 = buttonElement2.newWidgetButton();
  button6.label = "Form Edit Section";
  button6.type = "invoke.function";
  button6.name = "appletFunction";
  button6.id = "formsection";

  const button7 = buttonElement2.newWidgetButton();
  button7.label = "Banner";
  button7.type = "invoke.function";
  button7.name = "appletFunction";
  button7.id = "banner";

  const button8 = buttonElement2.newWidgetButton();
  button8.label = "Edit Whole Tab";
  button8.type = "invoke.function";
  button8.name = "appletFunction";
  button8.id = "tab";

  const button9 = buttonElement2.newWidgetButton();
  button9.label = "Form Edit Tab";
  button9.type = "invoke.function";
  button9.name = "appletFunction";
  button9.id = "formTab";

  buttonElement2.addWidgetButton(button5, button6, button7, button8, button9);

  buttonSection.addElement(title, buttonElement1, buttonElement2);
  buttonSection.id = "101";

  return buttonSection;
}

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

async function posttrackform(req, res, app) {}

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