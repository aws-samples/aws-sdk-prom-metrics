#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { Stack, StackProps, LegacyStackSynthesizer } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import { ConfigClass } from "../../validator/lib/ConfigClass";

interface AwsPromRoleProps extends StackProps {
  config: ConfigClass;
}

export class AwsPromRole extends Stack {
  config: ConfigClass;

  constructor(scope: Construct, id: string, props: AwsPromRoleProps) {
    super(scope, id, props);
    this.config = props.config;

    const deployConfig = this.config.config.deploymentConfig!;

    new iam.Role(this, "PromAwsSdkGatherRole", {
      roleName: this.config.deployRoleName,
      assumedBy: new iam.FederatedPrincipal(
        `arn:aws:iam::${deployConfig.awsAccountId}:oidc-provider/${deployConfig.oidcProvider}`,
        {
          StringEquals: {
            [deployConfig.oidcProvider + ":aud"]: "sts.amazonaws.com",
            [deployConfig.oidcProvider +
            ":sub"]: `system:serviceaccount:${deployConfig.namespace}:${this.config.deployServiceAccountName}`,
          },
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      description: "AWS SDK Prometheus Metric Gathering Identity",
      maxSessionDuration: cdk.Duration.hours(1),
      inlinePolicies: {
        requiredPerms: new iam.PolicyDocument({
          statements: this.buildStatements(),
        }),
      },
    });
  }

  buildStatements(): Array<iam.PolicyStatement> {
    const statements: Array<iam.PolicyStatement> = [];
    this.config.config.metrics.forEach((metric) => {
      const statement: iam.PolicyStatement = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: metric.iamPermissions?.actions,
        resources: metric.iamPermissions?.resources,
      });
      statements.push(statement);
    });
    return statements;
  }
}

const app = new cdk.App();
const c = new ConfigClass({ configFilename: process.env.config });
if (!c.config.deploymentConfig) {
  console.error(
    `In order to perform a deployment, the 'deploymentConfig' section of the configuration file must be present!`
  );
  process.exit(1);
}

new AwsPromRole(app, c.deployStackName, {
  config: c,
  description: "Prometheus AWS CLI Metric Gather Role Stack",
  synthesizer: new LegacyStackSynthesizer(),
});
