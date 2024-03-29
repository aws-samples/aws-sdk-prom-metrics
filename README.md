# Summary

The AWS control plane contains a rich set of information that can be operationally very useful!  Have you ever found yourself wishing you had the output of an AWS SDK Command to enrich your dashboards or alerts?

This project aims to make that easy by using a simple YAML configuration file to create a container that can be 'scraped' by Prometheus to produce metrics from AWS SDK Command outputs!

Some common use cases:
- Use the `DescribeSubnets` command to retrieve the remaining number of IP Addresses.
- Use the `DescribeFilesystems` command for FSx for Lustre to determine the current state of a filesystem.
- Use the `ListServiceQuotasCommand` command to determine how many ECS Tasks you're permitted to run in your account.

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

Configure the AWS CLI with credentials for your AWS Account (you can skip this step in Cloud9).  Instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)

## Deployment to an EKS Cluster Setup

Configure the kubectl command to point to your EKS Cluster.  Instructions [here](https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html)

## If you don't already have an EKS Cluster with Prometheus and Grafana

Follow the steps outlined here:

1. Create a Cloud9 Environment following all steps in the EKS Workshop section 'Start the Workshop...' here: [https://www.eksworkshop.com/020_prerequisites/](https://www.eksworkshop.com/020_prerequisites/)
2. Create an EKS Cluster following all steps in the EKS Workshop section 'Launch using eksctl' section here: [https://www.eksworkshop.com/030_eksctl/](https://www.eksworkshop.com/030_eksctl/)
3. Configure  / Install Amazon Managed Prometheus (AMP) on the cluster above by following the quickstart guide here: [https://aws.amazon.com/blogs/mt/getting-started-amazon-managed-service-for-prometheus/](https://aws.amazon.com/blogs/mt/getting-started-amazon-managed-service-for-prometheus/)
4. Configure Amazon Managed Grafana with the AMP environment above as a data-source.  Quickstart guide here: [https://docs.aws.amazon.com/grafana/latest/userguide/getting-started-with-AMG.html](https://docs.aws.amazon.com/grafana/latest/userguide/getting-started-with-AMG.html)

# Testing our configuration file

Once you've completed the setup steps outlined in [Setup Our Build Environment](#setup-our-build-environment) we can start building!

Let's begin by using one of the included [configuration files](config/subnet-remaining-ips.yaml) and run it locally to test that things work.

Run the command:

```bash
make config=subnet-remaining-ips.yaml runLocal
```

This will parse the configuration file and assure it is well-formed.  It will install the required SDK libraries, and run a node server locally on port 4000 that will begin producing metrics!

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

You should *always* [Test your configuration file](#testing-our-configuration-file) before building or deploying a container.  This will verify your configuration is well-formed and working!

We've verified that our configuration file runs and collects the metrics we expect!  Now let's build a Docker image.

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
 => => naming to docker.io/library/aws-prom-sdk-metrics:latest    
```

A docker image will exist locally named `aws-sdk-prom-metrics:latest` that you can now publish to a docker registry for deployment!

If you choose to use EKS, continue with [deploy to EKS](#deploy-to-eks).  If you're using another container orchestration environment you will need to run the built container in that system.  It will require access to an AWS Principal (role/user) with permissions to run the SDK calls you've configured.  Once started a Prometheus operator will need to scrape for metrics on http port 4000 on the `/metrics` URL.

# Deploy to EKS

Make sure you've [tested your configuration file](#testing-our-configuration-file) and [built a docker container](#build-a-container)

## Push the container image to ECR

Create an ECR registry in the region and account you're running your EKS cluster.  You can choose any name you like as long as you update your configuration file below.

For our example let's make a new one called `aws-sdk-prom-metrics`.  Instructions are [here](https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-create.html)

Now sign your Docker environment into your private registry following [these](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html) instructions.

After pushing your image, you should have the container image we created above available in your environment.

The commands below will do this for you. Update the CONFIG_FILE variable to match the configuration file you're building and pushing.

```bash
export CONFIG_FILE=subnet-remaining-ips.yaml
aws ecr create-repository --repository-name aws-sdk-prom-metrics
export REPOSITORY_URI=$(aws ecr describe-repositories --repository-name aws-sdk-prom-metrics | jq -r '.repositories[0].repositoryUri')
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${REPOSITORY_URI}
make config=${CONFIG_FILE} docker
docker tag aws-sdk-prom-metrics:latest ${REPOSITORY_URI}:latest
docker push ${REPOSITORY_URI}
```

## Update your configuration file

The included example configuration files in the `config` directory all included commented out information relating to deployment.

Uncomment / add the deployment section of the configuration like:

```yaml
deploymentConfig:
  # Create / Determine your OIDC provider.  See: https://docs.aws.amazon.com/eks/latest/userguide/enable-iam-roles-for-service-accounts.html
  oidcProvider: oidc.eks.[region].amazonaws.com/id/[identifier]
  # The namespace that will be used for our metric gathering container.  It will be created if it doesn't exist.
  namespace: aws-sdk-prom-metrics
  # Your AWS Account ID.  Used while constructing the roles trust information.
  awsAccountId: "012345678910"
  # The URI to retrieve the container image you built with 'make docker' and pushed to.
  imageUri: 012345678910.dkr.ecr.[region].amazonaws.com/aws-sdk-prom-metrics:label
  # The Service Account Name that will be created in the EKS cluster.
  serviceAccountName: aws-sdk-prom-metrics
```

You must update `oidcProvider`, `awsAccountId`, and `imageUri`.  Assure the `awsAccountId` remains in quotes even though it's numeric!

Uncomment / add the required permissions for each of the metrics you're collecting.  These permissions are used to create the role.  For example:

```yaml
    iamPermissions:
      actions:
        - ec2:DescribeSubnets
      resources:
        # You can limit this scope to specific Subnet resource ARNs if they are known up-front
        - '*'
```

In YAML the * needs to be quoted like shown - '*'.

## Deploy the role

This tool can use the AWS CDK to deploy a correctly formed role and policy for you automatically.

NOTE: the default role name is `aws-sdk-prom-metrics-role` and default CloudFormation stack name is `aws-sdk-prom-metrics-role-stack`.  
- To specify a different Role Name add `iamRoleName` with your chosen value to the `deploymentConfig` in your configuration file.
- To specify a different CloudFormation stack name add `stackName` with your chosen value to the `deploymentConfig` in your configuration file.

Deploy the role by running:

```bash
make config=subnet-remaining-ips.yaml deployRole
```

You should see output similar to this showing that CloudFormation (by way of the CDK) is deploying a role to your account!

```text
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@ Using the CDK to deploy the IRSA IAM Role @@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
cdk deploy --require-approval=never

✨  Synthesis time: 6.36s

aws-sdk-prom-metrics-role-stack: deploying...
aws-sdk-prom-metrics-role-stack: creating CloudFormation changeset...

 ✅  aws-sdk-prom-metrics-role-stack

✨  Deployment time: 34.1s
```

A benefit of using the CDK in this case is updated to your configuration file can be handled via a Stack update versus needing to destroy and rebuild.

If you add more metrics, or make updates that would require an update to your IAM permissions, simply re-run the `deployRole` command as shown above!

## Deploy the Kubernetes Deployment!

This will create a new 'Deployment' in the namespace you've specified in your configuration file, using the IRSA role we created earlier.

Run the command:

```bash
 make config=subnet-remaining-ips.yaml deployEks
 ```

You'll see output similar to this:

```text
...
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@ Using the kubectl API to deploy the namespace and metric-gather deployment @@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
npm run deployEks

> aws-sdk-prom-metrics@0.0.1 deployEks
> node build/deployer/lib/deployEks.js

Creating namespace 'aws-sdk-prom-metrics'
Creating Service Account named 'aws-sdk-prom-metrics'.
Creating Deployment named 'aws-sdk-prom-metrics-collector-deployment'
```

After a few moments, describe the namespace, and you should see everything running!

```bash
kubectl get all -n aws-sdk-prom-metrics
```

Which should produce an output like:

```text
NAME                                                            READY   STATUS    RESTARTS   AGE
pod/aws-sdk-prom-metrics-collector-deployment-879dbccb7-z6fsr   1/1     Running   0          43s

NAME                                                        READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/aws-sdk-prom-metrics-collector-deployment   1/1     1            1           11m

NAME                                                                  DESIRED   CURRENT   READY   AGE
replicaset.apps/aws-sdk-prom-metrics-collector-deployment-879dbccb7   1         1         1       11m
```

You can also verify by port forwarding to port 4000 that your `/metrics` URL produces results!

## In Prometheus

Search within Prometheus for metrics starting with `awssdk` and you should see your new metric is flowing.

# Expanding on the examples provided

If you have a novel use-case that exists outside the examples, you will need to create your own configuration file.

## Identify the SDK Library

Once you know the command you need to run, you'll need to identify the name of the JavaScritpt AWS SDK v3 library to use.

Start with the documentation [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/index.html)

The Clients list in the sidebar is the name that should be the value used for `sdkLibrary` in the configuration file.

As an example if I was going to query an EFS Filesystem to determine the provisioned throughput, I'd use the value `@aws-sdk/client-efs`.

## Identify the SDK Client

Clicking on the SDK Library above will bring you to a details page.  Like [this](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-efs/index.html) for EFS.

The name of the Client library used is our next parameter.  The SDK Libraries usually have two shown in the top right side-bar.  

One client is usually a 'v2' compatible style, and the other is 'v3'.  We want the 'v3' one for our configuration file.

The 'v3' one usually ends in `Client`.

Continuing with our DynamoDB example we can see two 'Clients'.  One called `EFS` and the other called `EFSClient`.

In this case we would use the value `EFSClient` for `sdkClientName` in our configuration file!

## Identify the SDK Command to run

Now we need to find the SDK command to run.  The list of commands are listed in the sidebar.  We can ignore the ones that end in `Input`, and `Output` and focus on the ones that end in `Command`.

Since I want to Describe my filesystems, I search for describefilesystems and find the `DescribeFileSystemsCommand` command.

In this example I would use `DescribeFileSystemsCommand` for `sdkCommand` in our configuration file.

## Identify what values I want from the command

Clicking the `DescribeFileSystemsCommand` I arrive at [this](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-efs/classes/describefilesystemscommand.html) page.

Here I have links to the `DescribeFileSystemsCommandInput` and `DescribeFileSystemsCommandOutput`.  I click on the [link](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-efs/interfaces/describefilesystemscommandoutput.html) for `DescribeFileSystemsCommandOutput`.

Here I see the response will contain metadata, and a `FileSystemDescription[]`.  Clicking the [link](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-efs/modules/filesystemdescription.html) to `FileSystemDescription` I finally see what I'm after: `ProvisionedThroughputInMibps`.

Clicking the link to `ProvisionedThroughputInMibps` I can see the value is `undefined | number`.  Meaning I can use it for a Gauge value.

## Create a JSON pointer

Sometimes this can be challenging, but using the AWS CLI Can be helpful.

```bash
aws efs describe-file-systems --output json
```

This produces the same JSON File that our command will be interrogating which can make it a little easier to visualize

```json
{
    "FileSystems": [
        {
            "OwnerId": "01234567890",
            "CreationToken": "abcd-efgh",
            "FileSystemId": "fs-abcdefgh",
            "FileSystemArn": "arn:aws:elasticfilesystem:us-east-2:01234567890:file-system/fs-abcdefgh",
            "CreationTime": "2022-06-02T09:33:06-04:00",
            "LifeCycleState": "available",
            "NumberOfMountTargets": 1,
            "SizeInBytes": {
                "Value": 28435683328,
                "Timestamp": "2022-07-18T10:20:58-04:00",
                "ValueInIA": 0,
                "ValueInStandard": 28435683328
            },
            "PerformanceMode": "maxIO",
            "Encrypted": false,
            "ThroughputMode": "provisioned",
            "ProvisionedThroughputInMibps": 1024.0,
            "Tags": []
        }
    ]
}
```

There are JSON pointer tutorials and 'testers' on the web that will let you paste your JSON output and test pointers until you get the data you want.  Just be careful not to paste any sensitive information into these sites!

I arrive at the following JSON pointer to get the value I'm interested in `$.FileSystems[*].ProvisionedThroughputInMibps`

The value of `$.FileSystems[*].ProvisionedThroughputInMibps` will be used as my `gaugeValue` in my configuration file.

## Putting it all together

Now my configuration file I've built would look like this:

```yaml
metricPrefix: awssdk

metrics:
  - frequency: 1
    metricName: "efs_provisioned_throughput"
    metricHelp: Provisioned Throughput of our EFS Filesystems in MiB/s
    sdkLibrary: "@aws-sdk/client-efs"
    sdkClientName: "EFSClient"
    sdkCommand: "DescribeFileSystemsCommand"
    gaugeValue: "$.FileSystems[*].ProvisionedThroughputInMibps"
```

I write this to a file named `testing.yaml` in my `config` directory and test it as outlined under [Testing](#testing-our-configuration-file) above.

```bash
make config=testing.yaml runLocal

...
npm run validate

> aws-sdk-prom-metrics@0.0.1 validate
> node build/validator/lib/validate.js

Verifying values in our configuration file are correct. . . 


No configuration errors present in 'testing.yaml'!  Recommend verifying using runLocal before deployment.
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@@@ Running the node.js server locally.  Connect on http://localhost:4000/metrics @@@
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
node build/executor/lib/index.js
server running on port 4000
Running command for metric efs_provisioned_throughput
Successfully executed command for metric efs_provisioned_throughput.  Converting to Prometheus metric values.
```

Verify we got some data from `/metrics`:

```bash
curl localhost:4000/metrics

...
# HELP awssdk_efs_provisioned_throughput Provisioned Throughput of our EFS Filesystems in MiB/s
# TYPE awssdk_efs_provisioned_throughput gauge
awssdk_efs_provisioned_throughput 1024
```

During testing you will get parsing / validation errors if your JSON pointer isn't correctly formed and / or the SDKs you've referenced don't exist.  The tool does it's very best to help you arrive at a syntax that works!

It's worth noting that some commands show their input as being 'optional' (ie `string | undefined`) however when they're executed, they will error out stating they require an input.  In this case the configuration file will pass validation, but will fail testing using `runLocal`.  Define the correct `sdkCommandInput` in the configuration files to address this.

## Create a PR with your example configuration file describing your use-case!

Please create a pull request with your commented configuration file that describes your use-case for others to benefit from!

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
