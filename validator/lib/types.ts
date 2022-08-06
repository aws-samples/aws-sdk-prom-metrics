// import {Statement} from '@aws-sdk/client-iam'

export interface IConfigMetricSectionLabels {
  [key: string]: string;
}

export interface IConfigMetricPermissions {
  actions: Array<string>;
  resources: Array<string>;
}

export interface IConfigMetricsSection {
  metricName: string;
  metricHelp: string;
  // Required if deployment is used
  iamPermissions?: IConfigMetricPermissions;
  frequency: number;
  sdkClientName: string;
  sdkLibrary: string;
  sdkCommand: string;
  sdkCommandInput?: any;
  gaugeValue?: string;
  labels?: IConfigMetricSectionLabels;
}

export interface IConfigForDeployment {
  oidcProvider: string;
  awsAccountId: string;
  namespace: string;
  imageUri: string;
  serviceAccountName?: string;
  iamRoleName?: string;
  stackName?: string;
}

export interface IConfig {
  metricPrefix: string;
  deploymentConfig?: IConfigForDeployment;
  metrics: Array<IConfigMetricsSection>;
}
