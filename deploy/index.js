#!/usr/bin/env node

const stdin = process.openStdin();
const { stdout } = process;
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const chalk = require("chalk");
const { exec } = require("child_process");

const info = chalk.green("i");
const warning = chalk.yellow("WARNING:");

const main = async ({ region, lambdaName, production }) => {
  const env = production ? "PROD" : "dev";

  // pot. install env vars
  // ...

  // check for DB changes
  const gitLastTags = (
    await runShellCommand(
      "git for-each-ref --sort=creatordate --format '%(refname)' refs/tags"
    )
  )
    .split("\n")
    .filter((tag) => new RegExp(`refs/tags/BE-${env}`).test(tag))
    .reverse();
  if (gitLastTags[1]) {
    const gitChangedSql = await runShellCommand(
      `git diff ${gitLastTags[0]} ${gitLastTags[1]} --stat -- sql`
    );

    if (gitChangedSql) {
      console.log(info, "Changes of SQL schema since last release:\n");
      console.log(gitChangedSql);
      console.log(warning, "ATTENTION", "SQL Schema changed");
      console.log(warning, "Please take the required actions!");

      if (isDefaultNo(await askQuestion(`Continue? [y/N]`))) {
        console.log(info, "Aborted.");
        process.exit(1);
      }
    }
  } else {
    console.log(warning, "ATTENTION", "SQL Schema not yet created.");
    console.log(warning, "Please take the required actions!");
    if (isDefaultNo(await askQuestion(`Continue? [y/N]`))) {
      console.log(info, "Aborted.");
      process.exit(1);
    }
  }

  try {
    await runShellCommand("rm lambda.zip");
  } catch (e) {
    // nothing
  }
  console.log(info, "Installing packages...");

  await runShellCommand("npm ci --production");
  console.log(info, "Zipping...");
  await runShellCommand("zip -r lambda.zip ./*");
  console.log(info, "Uploading...");
  await runShellCommand(
    `aws --region "${region}" lambda update-function-code --function-name "${lambdaName}" --zip-file fileb://$(pwd)/lambda.zip`
  );
  await runShellCommand("rm lambda.zip");
};

const argv = yargs(hideBin(process.argv))
  .command("$0", "", (yargs) =>
    yargs
      .positional("region", {
        type: "string",
        description: "Region to be used",
      })
      .positional("lambda-name", {
        description: "The name of the lambda function.",
        type: "string",
      })
      .usage("$0 <region> <lambda-name>")
  )

  .option("production", {
    type: "boolean",
    description: "Deploy into an production environment",
  })

  .help()
  .alias("help", "h").argv;

const {
  _: [region = "eu-central-1", lambdaName],
  production,
} = argv;

main({
  region,
  lambdaName,
  production,
})
  .then(() => {
    console.log(info, "Done.");
    process.exit(0);
  })
  .catch((e) => {
    console.log(chalk.red("ERROR:"), e);
    process.exit(1);
  });

function isDefaultNo(answer) {
  return answer !== "y" && answer !== "Y";
}

async function askQuestion(question, PAD_TO_COLLUM = 0) {
  stdout.write(" ".repeat(PAD_TO_COLLUM) + chalk.yellow("? ") + question + " ");

  const input = await getUserInput();

  return input;
}

async function getUserInput() {
  return new Promise((res) => {
    stdin.addListener("data", (d) => {
      res(d.toString().trim());
    });
  });
}

async function runShellCommand(command) {
  return new Promise((res, rej) => {
    exec(
      command,
      { env: { ...process.env, LC_ALL: "en_US.UTF-8" } },
      (error, stdout) => {
        if (error !== null) {
          rej(error);
        } else {
          res(stdout);
        }
      }
    );
  });
}
