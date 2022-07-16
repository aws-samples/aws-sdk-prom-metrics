import * as path from "path";
import Ajv, { JSONSchemaType } from "ajv";
const { JSONPath } = require("jsonpath-plus");
const tsj = require("ts-json-schema-generator");
import { Config } from "ts-json-schema-generator";
const jsf = require("json-schema-faker");
import { Schema } from "json-schema-faker";
import { ConfigClass } from "./ConfigClass";
import { IConfig, IConfigMetricsSection } from "./types";

const avj = new Ajv({ allowUnionTypes: true });

const validPromMetric = (metricName: string): boolean => {
  const metricRegex = new RegExp("^[a-zA-Z_:][a-zA-Z0-9_:]*$");
  return metricRegex.test(metricName);
};

const generateSchema = async (
  metricConfig: IConfigMetricsSection,
  direction: "Input" | "Output"
) => {
  try {
    const config: Config = {
      path: path.resolve(
        `node_modules/${metricConfig.sdkLibrary}/dist-types/index.d.ts`
      ),
      tsconfig: path.resolve("tsconfig.json"),
      type: `${metricConfig.sdkCommand}${direction}`,
    };
    return tsj.createGenerator(config).createSchema(config.type);
  } catch (e) {
    console.log(
      `Failed to load types for module ${metricConfig.sdkLibrary}.  Please file a bug with the configuration file used.\n${e}`
    );
    process.exit(1);
  }
};

const generateDummyJSONFromSchema = async (
  metricConfig: IConfigMetricsSection
) => {
  let schema = await generateSchema(metricConfig, "Output");
  // schema = patchSchema(schema)
  jsf.option({ alwaysFakeOptionals: true });
  return jsf.resolve(schema as Schema);
};

const inputShapeValid = async (
  metricConfig: IConfigMetricsSection,
  testInput: any
): Promise<boolean> => {
  let schema = await generateSchema(metricConfig, "Input");
  let rc: boolean = true;
  try {
    // Our <template> doesn't matter for our use-case so we will just re-use IConfig
    const inputSchema: JSONSchemaType<IConfig> = schema as any;
    const inputValidator = avj.compile(inputSchema);
    if (!inputValidator(testInput)) {
      console.log(
        `Command ${
          metricConfig.sdkCommand
        } input missing or incorrect: ${JSON.stringify(
          inputValidator.errors,
          null,
          2
        )}`
      );
      rc = false;
    }
  } catch (e) {
    console.log(
      `Failed to generate an Input schema shape for ${metricConfig.sdkLibrary}.  Please file a bug.\n${e}`
    );
    process.exit(1);
  }
  return rc;
};

const jsonPathValid = (jsonPath: string, dummyJSON: any): boolean => {
  const result = JSONPath({
    path: jsonPath,
    json: dummyJSON,
    preventEval: true,
  });
  // We ALWAYS have fake data in our dummy JSON so any zero-length pointer indicates we have an invalid one.
  return result.length > 0;
};

const jsonPathIsNumber = (jsonPath: string, dummyJSON: any): boolean => {
  const result = JSONPath({
    path: jsonPath,
    json: dummyJSON,
    preventEval: true,
  });
  return !isNaN(result[0]);
};

(async () => {
  const c = new ConfigClass({
    configFilename: process.env.config,
  });
  console.log("Verifying values in our configuration file are correct. . . \n");
  // Let's fully parse everything in the configuration file versus throwing an error/exiting at the first error
  let configErrors = false;
  // Assure our metricPrefix is valid
  if (!validPromMetric(c.config.metricPrefix)) {
    console.log(
      `Metric ${c.config.metricPrefix}: contains characters not permitted for Prometheus metrics.  Names must match regular expression '[a-zA-Z_:][a-zA-Z0-9_:]*'`
    );
    configErrors = false;
  }
  for (const metric of c.config.metrics) {
    let outputDummy: any;
    try {
      outputDummy = await generateDummyJSONFromSchema(metric);
    } catch (e) {
      console.log(
        `Failed to generate a dummy JSON from Schema for ${metric.sdkLibrary}.  Please file a bug.\n${e}`
      );
      process.exit(1);
    }

    // Assure our metricName is valid for Prometheus
    if (!validPromMetric(metric.metricName)) {
      console.log(
        `Metric ${metric.metricName}: contains characters not permitted for Prometheus metrics. Names must match regular expression '[a-zA-Z_:][a-zA-Z0-9_:]*'`
      );
      configErrors = true;
    }

    // Check our input shape if present
    if (metric.sdkCommandInput) {
      await inputShapeValid(metric, metric.sdkCommandInput);
    } else {
      // Input not present, lets assure that empty is OK for our command!
      await inputShapeValid(metric, {});
    }

    // Check our gauge if present
    if (metric.gaugeValue) {
      if (!jsonPathValid(metric.gaugeValue, outputDummy)) {
        console.log(
          `Metric ${metric.metricName}: Gauge Value of '${metric.gaugeValue}' is not present in the output for ${metric.sdkCommand}`
        );
        configErrors = true;
      } else {
        // Path is valid, let's make sure values are numeric.
        if (!jsonPathIsNumber(metric.gaugeValue, outputDummy)) {
          console.log(
            `Metric ${metric.metricName}: Gauge Value of '${metric.gaugeValue}' is not a number.  Only number types are permitted in Gauges.`
          );
          configErrors = true;
        }
      }
    }
    // Check our labels
    if (metric.labels) {
      Object.keys(metric.labels).forEach((labelKey) => {
        if (!jsonPathValid(metric.labels![labelKey], outputDummy)) {
          console.log(
            `Metric ${metric.metricName}: Label ${labelKey} value of '${metric.gaugeValue} is not present in the output for ${metric.sdkCommand}`
          );
          configErrors = true;
        }
      });
    }
  }
  if (configErrors) {
    console.log(
      `\nErrors are present in configuration file '${process.env.config}'.  Correct them and try again.`
    );
    process.exit(1);
  } else {
    console.log(
        `\nNo configuration errors present in '${process.env.config}'!  Recommend verifying using runLocal before deployment.`
    )
  }
})();
