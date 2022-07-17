import { IConfig } from "./types";
import Ajv, { JSONSchemaType, ValidateFunction } from "ajv";
import * as configSchema from "./config-schema.json";
import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";

const avj = new Ajv({ allowUnionTypes: true });

export interface IConfigClass {
  configFilename?: string;
  configContents?: any;
}

export class ConfigClass {
  props: IConfigClass;
  config: IConfig;
  configRaw: any;
  configSchema: JSONSchemaType<IConfig> = configSchema as any;
  configValidator: ValidateFunction;
  deployStackName: string;
  deployRoleName: string;
  deployServiceAccountName: string;

  constructor(props: IConfigClass) {
    this.props = props;
    // filename
    if (this.props.configFilename) {
      const configFilePath = path.join(
        "config",
        `${this.props.configFilename}`
      );
      if (!fs.existsSync(configFilePath)) {
        console.error(
          `${configFilePath}: File not found.  Check the 'config' value passed to the make command`
        );
        process.exit(1);
      }
      const fileRead = fs.readFileSync(
        path.join("config", `${this.props.configFilename}`),
        { encoding: "utf8" }
      ) as any;
      try {
        this.configRaw = yaml.parse(fileRead) as any;
      } catch (err) {
        console.error(
          `${err} - ${this.props.configFilename}: Error parsing YAML. Assure all special characters in value are quoted.  ie: '*' or "*"`
        );
        process.exit(1);
      }
    } else {
      // Or direct load in the case of testcase execution
      if (this.props.configContents) {
        this.configRaw = this.props.configContents as any;
      }
      if (!this.configRaw) {
        throw new Error(
          `Either configFilename or configContents must be specified for our config parser!`
        );
      }
    }
    this.configValidator = avj.compile(this.configSchema);

    if (!this.configValidator(this.configRaw)) {
      console.error(
        `Config contains structural errors: ${JSON.stringify(
          this.configValidator.errors,
          null,
          2
        )}`
      );
      process.exit(1);
    }
    // const configRaw = this.configRaw as any
    this.config = this.configRaw as IConfig;

    this.deployRoleName =
      this.config.deploymentConfig?.iamRoleName || "aws-sdk-prom-metrics-role";
    this.deployStackName =
      this.config.deploymentConfig?.stackName ||
      "aws-sdk-prom-metrics-role-stack";
    this.deployServiceAccountName =
      this.config.deploymentConfig?.serviceAccountName ||
      "aws-sdk-prom-metrics-irsa";
  }

  allSdkLibrary() {
    const libraries: Array<string> = [];
    this.config.metrics.forEach((metric) => {
      libraries.push(metric.sdkLibrary);
    });
    return [...new Set(libraries)];
  }
}
