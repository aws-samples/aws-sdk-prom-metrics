import * as k8s from "@kubernetes/client-node";
import { ConfigClass } from "../../validator/lib/ConfigClass";

const createCollectDeployIfNotExists = async (
  k8sApi: k8s.AppsV1Api,
  config: ConfigClass
) => {
  const deploymentName = "prom-aws-sdk-metrics-collector-deployment";
  const deploymentNamespace = config.config.deploymentConfig!.namespace;
  const deployResponse = await k8sApi.listNamespacedDeployment(
    deploymentNamespace
  );
  let exists: boolean = false;
  deployResponse.body.items.forEach((deployment) => {
    if (deployment.metadata!.name! == deploymentName) {
      console.log(`Deployment named '${deploymentName}' already exists.`);
      exists = true;
    }
  });
  if (!exists) {
    console.log(`Creating Deployment named '${deploymentName}'`);
    await k8sApi.createNamespacedDeployment(deploymentNamespace, {
      metadata: {
        name: deploymentName,
        labels: { app: `prom-aws-sdk-collect` },
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            app: `prom-aws-sdk-metrics-collector`,
          },
        },
        template: {
          metadata: {
            labels: { app: `prom-aws-sdk-metrics-collector` },
            annotations: {
              "prometheus.io/scrape": "true",
              "prometheus.io/port": "4000",
            },
          },
          spec: {
            serviceAccountName: config.deployServiceAccountName,
            containers: [
              {
                name: "prom-aws-sdk-metrics-collector",
                image: config.config.deploymentConfig!.imageUri,
                imagePullPolicy: "Always",
                ports: [
                  {
                    containerPort: 4000,
                    name: "metrics",
                    protocol: "TCP",
                  },
                ],
                livenessProbe: {
                  httpGet: {
                    path: "/healthz",
                    port: 4000,
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 3,
                  failureThreshold: 10,
                },
                env: [
                  {
                    name: "config",
                    value: process.env.config,
                  },
                ],
              },
            ],
          },
        },
      },
    });
  }
};

const createServiceAccountIfNotExists = async (
  k8sApi: k8s.CoreV1Api,
  config: ConfigClass
) => {
  const namespace = config.config.deploymentConfig!.namespace;
  const deployResponse = await k8sApi.listNamespacedServiceAccount(namespace);
  let exists: boolean = false;
  deployResponse.body.items.forEach((deployment) => {
    if (deployment.metadata!.name! == config.deployServiceAccountName) {
      console.log(
        `Service Account named '${config.deployServiceAccountName}' already exists.`
      );
      exists = true;
    }
  });
  if (!exists) {
    console.log(
      `Creating Service Account named '${config.deployServiceAccountName}'.`
    );
    await k8sApi.createNamespacedServiceAccount(namespace, {
      metadata: {
        name: config.deployServiceAccountName,
        annotations: {
          "eks.amazonaws.com/role-arn": `arn:aws:iam::${
            config.config.deploymentConfig!.awsAccountId
          }:role/${config.deployRoleName}`,
        },
      },
    });
  }
};

const createNamespaceIfNotExists = async (
  k8sApi: k8s.CoreV1Api,
  namespace: string
) => {
  const nsResponse = await k8sApi.listNamespace();
  let exists: boolean = false;
  nsResponse.body.items.forEach((existingNamespace) => {
    if (existingNamespace.metadata!.name! == namespace) {
      console.log(`Namespace '${namespace}' already exists.`);
      exists = true;
    }
  });
  if (!exists) {
    console.log(`Creating namespace '${namespace}'`);
    await k8sApi.createNamespace({
      metadata: {
        name: namespace,
      },
    });
  }
};

(async () => {
  const c = new ConfigClass({ configFilename: process.env.config });

  const kc = new k8s.KubeConfig();
  kc.loadFromDefault();
  const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
  const k8sAppVpi = kc.makeApiClient(k8s.AppsV1Api);

  if (!c.config.deploymentConfig) {
    console.error(
      `In order to perform a deployment, the 'deploymentConfig' section of the configuration file must be present!`
    );
    process.exit(1);
  }

  try {
    await createNamespaceIfNotExists(
      k8sCoreApi,
      c.config.deploymentConfig.namespace
    );
    await createServiceAccountIfNotExists(k8sCoreApi, c);
    await createCollectDeployIfNotExists(k8sAppVpi, c);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
