import { RunCommand } from "./runCommand";
import { IConfigMetricsSection } from "../../validator/lib/types";

export interface ICollectMetrics {
  config: IConfigMetricsSection;
  gauge?: any;
  counter?: any;
}

export class CollectMetrics {
  props: ICollectMetrics;
  runCommand: RunCommand;
  lastRunSuccess: boolean = true;
  frequencyMs: number;
  gauge?: any;
  counter?: any;
  lastRun: number;

  constructor(props: ICollectMetrics) {
    this.props = props;
    if (props.gauge) {
      this.gauge = props.gauge;
    }
    if (props.counter) {
      this.counter = props.counter;
    }
    this.runCommand = new RunCommand({ config: props.config });
    this.lastRun = Date.now();
    // We'll get this into milliseconds to simplify our date math.
    this.frequencyMs = props.config.frequency * 60000;
  }

  async collect() {
    const metricName = `${this.props.config.metricName}`;
    try {
      this.lastRun = Date.now();
      console.log(`Running command for metric ${metricName}`);
      await this.runCommand.run();
      this.lastRunSuccess = true;
    } catch (e) {
      this.lastRunSuccess = false;
      console.error(`Error Collecting Metric Named '${metricName}' :`);
      console.error(e);
    }
    if (this.lastRunSuccess) {
      console.log(
        `Successfully executed command for metric ${metricName}.  Converting to Prometheus metric values.`
      );
      if (this.gauge) {
        this.runCommand.gaugeValues!.forEach((gaugeValue, index) => {
          if (this.runCommand.labels) {
            this.gauge.set(this.runCommand.labels[index], gaugeValue);
          } else {
            this.gauge.set(gaugeValue);
          }
        });
      }
      if (this.counter) {
        // We don't allow a counter without labels so we can iterate on the labels to determine how many we have
        if (this.runCommand.labels) {
          this.runCommand.labels.forEach((label) => {
            this.counter.inc(label, 1);
          });
        }
      }
    }
  }
}
