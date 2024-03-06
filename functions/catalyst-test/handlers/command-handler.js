"use strict";
import cliq from "zcatalyst-integ-cliq";
const command = cliq.command();

command.executionHandler(async (req, res) => {
  let text;
  const commandName = req.name;
  if (comp(commandName, "authorize")) {
    return authorize();
  } else if (comp(commandName, "myproducts")) {
    return getForm();
  } else if (comp(commandName, "newproduct")) {
    return newProductForm();
  }
});

function getForm() {
  const form = command.newHandlerResponse().newForm();
  form.title = "Asset Request";
  form.hint = "Raise your asset request";
  form.name = "ID";
  form.button_label = "Raise Request";
  form.version = 1;

  const actions = form.newFormActionsObject();
  actions.submit = actions.newFormAction("formFunctionLatest"); // ** ENTER YOUR FORM FUNCTION NAME HERE **

  form.actions = actions;

  const userName = form.newFormInput();
  userName.type = "text";
  userName.name = "username";
  userName.label = "Name";
  userName.hint = "Please enter your name";
  userName.placeholder = "John Reese";
  userName.mandatory = true;
  userName.value = "Harold Finch";
  form.addInputs(userName);

  const email = form.newFormInput();
  email.type = "text";
  email.format = "email";
  email.name = "email";
  email.label = "Email";
  email.hint = "Enter your email address";
  email.placeholder = "johnreese@poi.com";
  email.mandatory = true;
  email.value = "haroldfinch@samaritan.com";

  const assetType = form.newFormInput();
  assetType.type = "select";
  assetType.trigger_on_change = true;
  assetType.name = "asset-type";
  assetType.label = "Asset Type";
  assetType.hint = "Choose your request asset type";
  assetType.placeholder = "Mobile";
  assetType.mandatory = true;
  assetType.addOption(assetType.newFormValue("Laptop", "laptop"));
  assetType.addOption(assetType.newFormValue("Mobile", "mobile"));

  form.addInputs(email, assetType);
  return form;
}

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

function newProductForm() {
  return {
    type: "form",
    title: "Amazon Tracker",
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
