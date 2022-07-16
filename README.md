# Summary

Have you ever needed the output of an AWS SDK Command to enrich your dashboards, or alerts in your environment?

This project aims to make that easy by using a simple YAML configuration file.

Some common use cases:
- Use the DescribeSubnets command to retrieve the remaining number of IP Addresses.
- Use the DescribeFilesystems command for FSx for Lustre to determine the current state of a filesystem.
- Use the ListServiceQuotasCommand command to determine how many ECS Tasks you're permitted to run in your account.

# Usage Types

## Container Only

The first option is simply create a container image that you can choose to deploy in whatever manner you like.  

This container image will start a Node/Express server listening on port 4000 and will publish Prometheus metrics to the /metrics endpoint.

This provides flexibility to use anything from EKS to ECS, to whatever container platform you choose!

Note the container will need access to an AWS IAM Role either through metadata, or environment variables to function!

## Deployment to an EKS Cluster

The second option is full deployment to an EKS cluster.  

This option uses the AWS CDK to deploy an IAM Role that your EKS Pods can use via [IRSA](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)

Finally, it will create the Kubernetes Deployment on your behalf using the Kubernetes SDK.

# Install the required Build Tools

All the required development libraries are tools are available in an *AWS Cloud9* developer environment.  

To get started with Cloud9, follow this getting started guide [here](https://aws.amazon.com/cloud9/getting-started/).

Cloud9 is the easiest path forward for those who prefer not to install and configure these tools locally!

If you wish to configure your local environment, then continue below.

## Baseline Tools

Install the AWS CLI as outlined [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html).

Install NodeJS.  Any version between 14 and 18 should work fine.  You can find instructions [here](https://nodejs.org/en/download/)

Install the 'make' command.  Running the command `make -v` should produce an output.

Install a Docker client suitable for your operating system.  Running the command `docker -v` should produce an output.

## Tools for Deployment to an EKS Cluster

Install the 'kubectl' command suitable for your operating system.  You can find instructions [here](https://kubernetes.io/docs/tasks/tools/)

# Setup our build environment

## Baseline Setup

Install required libraries by running this command:

```bash
npm install
```

Configure the AWS ClI with credentials for your AWS Account (you can skip this step in Cloud9).  Instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)

## Deployment to an EKS Cluster Setup

Configure the kubectl command to point to your EKS Cluster.  Instructions [here](https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html)

## If you don't already have an EKS Cluster with Prometheus and Grafana

The 'eksctl' tool can quickly get an EKS Cluster up and running.  A quickstart guide can be found [here](https://docs.aws.amazon.com/eks/latest/userguide/getting-started-eksctl.html)

After you've got a running cluster you can add Amazon Managed Prometheus (AMP) by creating a workspace as outlined [here](https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-create-workspace.html) and using a helm chart to install Prometheus in your EKS Cluster as outlined [here](https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-onboard-ingest-metrics-new-Prometheus.html)

To visualize and explore the collected metrics you can add Amazon Managed Grafana (AMG) by following this guide [here](https://docs.aws.amazon.com/grafana/latest/userguide/getting-started-with-AMG.html).  Once setup - configure AMP as a datasource as outlined [here](https://docs.aws.amazon.com/grafana/latest/userguide/AMP-adding-AWS-config.html)

# Testing our configuration file

Once you've completed the setup steps outlined in [Setup Our Build Environment](#setup-our-build-environment) we can start building!

Let's begin by using one of the included [configuration files](config/subnet-remaining-ips.yaml) and run it locally to test that things work.

Run the command:

```bash
make config=subnet-remaining-ips.yaml runLocal
```

This will parse the configuration file and assure it is well formed.  It will install the required SDK libraries in the container, and run a container locally on port 4000 that will begin producing metrics!

Your output will look something like this:

```text
...
Verifying values in our configuration file are correct. . . 


No configuration errors present in 'subnet-remaining-ips.yaml'!  Recommend verifying using runLocal before deployment.
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@ Running the node.js server locally.  Connect on http://localhost:4000/metrics @@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
node build/executor/lib/index.js
server running on port 4000
```

After about a minute goes past you'll see a message like this:

```text
Successfully executed command for metric remaining_ips.  Converting to Prometheus metric values.
```

Now open a browser to [this](http://localhost:4000/metrics) address to see the output!

This will look something like this:

```text
# HELP awscli_remaining_ips Remaining IP Addresses for Subnet # TYPE awscli_remaining_ips gauge awscli_remaining_ips{subnet_id="subnet-abcd1234",availability_zone="us-east-1f",availability_zone_id="use1-az5"} 8126 awscli_remaining_ips{subnet_id="subnet-efgh5678",availability_zone="us-east-1c",availability_zone_id="use1-az6"} 8187
```

## Build a container

You should *always* [Test your configuration file](#testing-our-configuration-file) before building or deploying a container.  This will verify everything works correctly before a deployment!

We've verified that our configuration file turns into a container that runs and collects the metrics we expect!  Now let's build our image.

```text
make config=subnet-remaining-ips.yaml docker
```

Your output will look something like this:

```text
...
=> [2/5] WORKDIR /app                                                                                                                                                0.1s
 => [3/5] COPY ./build/ /app/                                                                                                                                         0.1s
 => [4/5] COPY ./config/ /app/config/                                                                                                                                 0.0s
 => [5/5] RUN npm install                                                                                                                                            35.7s
 => exporting to image                                                                                                                                                4.8s
 => => exporting layers                                                                                                                                               4.8s
 => => writing image sha256:f5e09affe74392864c61ecab1c775910151778f793af546e65fea8cc2a2e12f9                                                                          0.0s
 => => naming to docker.io/library/prom-aws-sdk-metrics:latest    
```

A docker image will exist locally named 'prom-aws-sdk-metrics:latest' that you can now publish to a docker registry for deployment!

If you choose to use EKS, continue with the instructions.  If you're using another system you will need to run the built container in that system.  It will require access to an AWS Principal with permissions to run the SDK calls you've configured.  Once started a Prometheus operator will need to scrape for metrics on http port 4000 on the /metrics URL.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.

