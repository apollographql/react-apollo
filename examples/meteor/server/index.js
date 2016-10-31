
import React from 'react';
import ReactDOMServer from 'react-dom/server'
import { renderToStringWithData } from 'react-apollo/server';
import { WebApp } from 'meteor/webapp';
import Cheerio from "cheerio/lib/cheerio";
import ApolloClient from 'apollo-client';
import fetch from "node-fetch";
import App, { networkInterface } from '/imports/App';

global.fetch = fetch;

function isAppUrl({ url }) {
  if (url === "/favicon.ico" || url === "/robots.txt") return false;
  if (url === "/app.manifest") return false;
  return true;
}

// Thank you FlowRouter for this wonderful idea :)
// https://github.com/kadirahq/flow-router/blob/ssr/server/route.js
function moveScripts(data) {
  const $ = Cheerio.load(data, { decodeEntities: false });
  const heads = $("head script").not("[data-ssr-ignore=\"true\"]");
  const bodies = $("body script").not("[data-ssr-ignore=\"true\"]");
  $("body").append([...heads, ...bodies]);

  // Remove empty lines caused by removing scripts
  $("head").html($("head").html().replace(/(^[ \t]*\n)/gm, ""));
  $("body").html($("body").html().replace(/(^[ \t]*\n)/gm, ""));
  return $.html();
}

function moveStyles(data) {
  const $ = Cheerio.load(data, { decodeEntities: false });
  const styles = $("head link[type=\"text/css\"]").not("[data-ssr-ignore=\"true\"]");
  $("head").append(styles);

  // Remove empty lines caused by removing scripts
  $("head").html($("head").html().replace(/(^[ \t]*\n)/gm, ""));
  return $.html();
}


function patchResWrite(originalWrite, { markup, initialState }) {
  return function patch(data) {
    if (typeof data === "string" && data.indexOf("<!DOCTYPE html>") === 0) {
      data = data.replace("<body>", `
        <script>
          window.__APOLLO_STATE__ = ${JSON.stringify(initialState)};
        </script>
        <body>
      `)
      data = moveStyles(data);
      data = moveScripts(data);
      data = data.replace("<body>", `<body><div id="root">${markup}</div>`);
    }
    originalWrite.call(this, data);
  };
}

WebApp.connectHandlers.use(Meteor.bindEnvironment((req, res, next) => {
  const client = new ApolloClient({ ssrMode: true, networkInterface });

  renderToStringWithData(<App client={client}/>)
    .then(result => {
      delete result.initialState.apollo.queries;
      delete result.initialState.apollo.mutations;
      res.write = patchResWrite(res.write, result);
      next();
    });
}));
