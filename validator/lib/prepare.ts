import { ConfigClass } from "./ConfigClass";
import { exec } from "child_process";
import * as fs from "fs";
import * as path from "path";

const findSDKVersion = (library: string): Promise<string> => {
  return new Promise((resolve) => {
    exec(`npm view ${library} version`, (error, stdout) => {
      if (error) {
        console.log(
          `Unable to determine the latest version of ${library} available.  Check the network or ~/.npmrc configuration.`
        );
        process.exit(1);
      }
      resolve(stdout.replace(/\r?\n|\r/g, ""));
    });
  });
};

const sdkExists = (packageName: string): Promise<boolean> => {
  return new Promise((resolve) => {
    exec(`npm view ${packageName}`, (error) => {
      if (error) {
        resolve(false);
      }
      resolve(true);
    });
  });
};

const createPackageJson = (
  c: ConfigClass,
  sdkNames: Array<string>,
  sdkVersions: Array<string>
) => {
  try {
    const fileRead = fs.readFileSync("package.json", {
      encoding: "utf8",
    }) as any;
    const buildPackageJson: any = JSON.parse(fileRead);
    sdkNames.forEach((sdkName, index) => {
      buildPackageJson.dependencies[sdkName] = sdkVersions[index];
    });
    fs.writeFileSync(
      path.join("build", "package.json"),
      JSON.stringify(buildPackageJson, null, 4)
    );
  } catch (e) {
    console.log(
      `Unable to write a package.json for our Docker image to the build/ directory: \n ${e}`
    );
    process.exit(1);
  }
};

(async () => {
  const c = new ConfigClass({
    configFilename: process.env.config,
  });

  const sdkVersions: Array<string> = [];
  // Verify all of our packages exist and determine the latest version of each package
  for (const sdkLib of c.allSdkLibrary()) {
    if (!(await sdkExists(sdkLib))) {
      console.log(
        `Unable to find library named ${sdkLib}.  Check the name or your npm repository configuration in ~/.npmrc`
      );
      process.exit(1);
    }
    const latestVersion = await findSDKVersion(sdkLib);
    sdkVersions.push(latestVersion);
  }

  // Build the package.json for our docker container.
  createPackageJson(c, c.allSdkLibrary(), sdkVersions);

  // Install our packages locally so our validate step will succeed checking in/out shapes.
  const sdkWithVersions: Array<string> = [];
  c.allSdkLibrary().forEach((sdkName, index) => {
    sdkWithVersions.push(`${sdkName}@${sdkVersions[index]}`);
  });
  exec(`npm install ${sdkWithVersions.join(" ")} --no-save`, (error) => {
    if (error) {
      console.log(
        `Unable to install packages ${sdkWithVersions.join(
          ", "
        )}.  Check the name of the package or your NPM configuration.\n${error}`
      );
      process.exit(1);
    } else {
      console.log(
        `Added AWS SDK Library(s) ${sdkWithVersions.join(", ")} to project`
      );
    }
  });
})();
