import express from "express";
const register = require("prom-client").register;
const promGauge = require("prom-client").Gauge;
const promCount = require("prom-client").Counter;
import { CollectMetrics } from "./collectMetric";
import { ConfigClass } from "../../validator/lib/ConfigClass";

const collectInterval = async () => {
  for (const collector of collectors) {
    if (Date.now() >= collector.lastRun + collector.frequencyMs) {
      collector.collect().then();
    }
  }
};

const collectors: Array<CollectMetrics> = [];
const c = new ConfigClass({ configFilename: process.env.config });
c.config.metrics.forEach((metric) => {
  let nvpCommon: any = {
    name: `${c.config.metricPrefix}_${metric.metricName}`,
    help: metric.metricHelp,
  };
  if (metric.labels) {
    nvpCommon.labelNames = Object.keys(metric.labels);
  }
  if (metric.gaugeValue) {
    collectors.push(
      new CollectMetrics({
        config: metric,
        gauge: new promGauge({
          ...nvpCommon,
        }),
      })
    );
  } else {
    collectors.push(
      new CollectMetrics({
        config: metric,
        counter: new promCount({
          ...nvpCommon,
        }),
      })
    );
  }
});

// We'll evaluate each minute if we need to collect
setInterval(async () => {
  await collectInterval();
}, 60000);

const app = express();
app.listen(4000, () => {
  console.log(`server running on port 4000`);
});

app.get("/", (request, response) => {
  response.send(
    "Prometheus AWS CLI Metric Collector.  Collects metrics from AWS SDK Calls."
  );
});

app.get("/healthz", (request, response) => {
  response.send("healthy");
});

app.get("/metrics", async (request, response) => {
  response.send(await register.metrics());
});
