import { IConfigMetricsSection } from "../../validator/lib/types";
const { JSONPath } = require("jsonpath-plus");

export interface IRunCommand {
  config: IConfigMetricsSection;
}

type labelContent = string | number;

interface labelObject {
  [key: string]: labelContent;
}

export class RunCommand {
  config: IConfigMetricsSection;
  responses: Array<any> = []
  nextToken?: string
  labels?: Array<labelObject>;
  gaugeValues?: Array<labelContent>;

  constructor(props: IRunCommand) {
    this.config = props.config;
  }

  async run() {
    await this.executeApiCommand();
    if(this.config.labels) {
      this.extractLabelsFromResponse();
    }
    if (this.config.gaugeValue) {
      this.extractGaugeFromResponse();
    }
  }

  private async executeApiCommand() {
    const driverImport = await import(this.config.sdkLibrary);
    this.nextToken = "firstPass"
    this.responses = []
    const client = new driverImport[this.config.sdkClientName]({
      region: process.env.AWS_REGION,
    });
    while(this.nextToken) {
      let input = this.config.sdkCommandInput || {};
      if(this.nextToken && this.nextToken != "firstPass") {
        input.NextToken = this.nextToken
      } else {
        delete(input.NextToken)
      }
      const command = new driverImport[this.config.sdkCommand](input);
      const response = await client.send(command);
      if(response.hasOwnProperty('NextToken') && response.NextToken) {
        this.nextToken = response.NextToken
      } else {
        this.nextToken = undefined
      }
      this.responses.push(response);
    }
  }

  private extractLabelsFromResponse() {
    const labelContents: Array<labelObject> = []
    this.responses.forEach((response) => {
      const labelContentsWorking: Array<labelObject> = []
      Object.keys(this.config.labels!).forEach((labelName) => {
        const jsonValues = JSONPath(
            this.config.labels![labelName],
            response
        );
        if (Array.isArray(jsonValues)) {
          const jv = jsonValues as Array<labelContent>;
          jv.forEach((value, index) => {
            if (!labelContentsWorking[index]) {
              labelContentsWorking[index] = {};
            }
            labelContentsWorking[index][labelName] = value;
          });
        } else {
          if (!labelContentsWorking[0]) {
            labelContentsWorking[0] = {};
          }
          labelContentsWorking[0][labelName] = jsonValues;
        }
      });
      labelContents.push(...labelContentsWorking)
    })
    if(labelContents) {
      this.labels = labelContents
    }
  }

  private extractGaugeFromResponse() {
    const gaugeValues: Array<labelContent> = [];
    this.responses.forEach((response) => {
      const jsonValues = JSONPath(this.config.gaugeValue!, response);
      if (Array.isArray(jsonValues)) {
        const jv = jsonValues as Array<labelContent>;
        jv.forEach((value) => {
          gaugeValues.push(value);
        });
      } else {
        gaugeValues.push(jsonValues);
      }
    });
    this.gaugeValues = gaugeValues;
  }
}
