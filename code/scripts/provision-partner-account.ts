import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { PartnerAccountProvisioningService, createApiServices } from "@puresoc/api";
import { loadConfig } from "@puresoc/config";
import { createPrismaClient } from "@puresoc/database";

const usage = `Usage:
  Attach a unique owner login to the populated Romanian demo portfolio:
  pnpm operator:provision-partner -- \\
    --email partner@example.com \\
    --display-name "Partner Owner" \\
    --existing-partner-slug asterion-cloud-partners \\
    --disable-seeded-logins

  Create a new, empty partner workspace:
  pnpm operator:provision-partner -- \\
    --email partner@example.com \\
    --display-name "Partner Owner" \\
    --partner-name "Partner Company"

Options:
  --partner-slug <slug>   Optional stable URL slug. Derived from the partner name by default.
  --existing-partner-slug Attach the account to an existing active partner portfolio.
  --disable-seeded-logins Disable known shared Asterion seed logins after attachment.
  --password-file <path>  Read the password from a container-local secret file instead of prompting.
  --help                  Show this help.

The command never accepts a password as a command-line argument and never prints it.`;

try {
  await main();
} catch (error) {
  console.error(JSON.stringify(safeErrorOutput(error), null, 2));
  process.exitCode = 1;
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: false,
    strict: true,
    options: {
      email: { type: "string" },
      "display-name": { type: "string" },
      "partner-name": { type: "string" },
      "partner-slug": { type: "string" },
      "existing-partner-slug": { type: "string" },
      "disable-seeded-logins": { type: "boolean", default: false },
      "password-file": { type: "string" },
      help: { type: "boolean", default: false }
    }
  });

  if (values.help) {
    console.log(usage);
    return;
  }

  const email = requiredOption(values.email, "--email");
  const displayName = requiredOption(values["display-name"], "--display-name");
  const partnerName = values["partner-name"]?.trim() || null;
  const existingPartnerSlug = values["existing-partner-slug"]?.trim() || null;
  if (Boolean(partnerName) === Boolean(existingPartnerSlug)) {
    throw new Error(`Choose exactly one of --partner-name or --existing-partner-slug.\n\n${usage}`);
  }
  if (existingPartnerSlug && values["partner-slug"]) {
    throw new Error(`--partner-slug cannot be used with --existing-partner-slug.\n\n${usage}`);
  }
  if (values["disable-seeded-logins"] && existingPartnerSlug !== "asterion-cloud-partners") {
    throw new Error("--disable-seeded-logins is only valid for the asterion-cloud-partners demo portfolio.");
  }
  const password = values["password-file"]
    ? passwordFromFile(values["password-file"])
    : await confirmedHiddenPassword();
  const config = loadConfig();
  if (config.app.persistenceMode !== "prisma") {
    throw new Error("Partner account provisioning requires PURESOC_PERSISTENCE_MODE=prisma.");
  }

  const prisma = createPrismaClient();
  try {
    await prisma.$connect();
    const services = createApiServices({
      config,
      prismaClient: prisma
    });
    const provisioner = new PartnerAccountProvisioningService({
      repository: services.identityRepository,
      auditWriter: services.auditWriter,
      partners: services.partners,
      partnerSlugExists: async (slug) =>
        Boolean(
          await prisma.partner.findUnique({
            where: { slug },
            select: { id: true }
          })
        ),
      findPartnerBySlug: async (slug) => {
        const partner = await prisma.partner.findUnique({
          where: { slug },
          select: { id: true, name: true, slug: true, status: true }
        });
        return partner?.status === "active" ? partner : null;
      },
      attachPartnerMember: async (member) => {
        await prisma.partnerMember.create({ data: member });
      }
    });
    const result = await provisioner.provision({
      email,
      password,
      displayName,
      partnerName,
      partnerSlug: values["partner-slug"],
      existingPartnerSlug
    });
    const disabledSeededLoginCount = values["disable-seeded-logins"]
      ? await disableAsterionSeededLogins({ prisma, auditWriter: services.auditWriter, partnerId: result.partner.id })
      : 0;

    console.log(
      JSON.stringify(
        {
          ...result,
          disabledSeededLoginCount,
          nextActions: [
            "Share the login URL, email, and password through separate private channels.",
            "Ask the partner to sign in; the Romanian-first portfolio opens at /partners.",
            "Open a customer with a reason and confirm the active customer banner before reviewing its NIS2 evidence."
          ]
        },
        null,
        2
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function disableAsterionSeededLogins(input: {
  prisma: ReturnType<typeof createPrismaClient>;
  auditWriter: ReturnType<typeof createApiServices>["auditWriter"];
  partnerId: string;
}): Promise<number> {
  const seededEmails = ["mara@asterion.example", "leo@asterion.example"];
  const disabledAt = new Date();
  const result = await input.prisma.user.updateMany({
    where: {
      email: { in: seededEmails },
      disabledAt: null
    },
    data: { disabledAt }
  });

  await input.auditWriter.write({
    actorUserId: null,
    organizationId: null,
    targetType: "partner",
    targetId: input.partnerId,
    action: "operator.demo_seed_logins.disabled",
    afterJson: {
      disabledAt: disabledAt.toISOString(),
      disabledCount: result.count,
      reason: "external_partner_demo_handoff"
    }
  });

  return result.count;
}

function requiredOption(value: string | undefined, option: string): string {
  if (!value?.trim()) {
    throw new Error(`Missing ${option}.\n\n${usage}`);
  }
  return value;
}

function passwordFromFile(path: string): string {
  const password = readFileSync(path, "utf8").replace(/\r?\n$/, "");
  if (!password) {
    throw new Error("The password file is empty.");
  }
  return password;
}

async function confirmedHiddenPassword(): Promise<string> {
  const password = await readHiddenLine("Partner password: ");
  const confirmation = await readHiddenLine("Confirm password: ");
  if (password !== confirmation) {
    throw new Error("Passwords do not match; no account was created.");
  }
  return password;
}

async function readHiddenLine(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Interactive password input needs a TTY. Use --password-file with a mounted secret file.");
  }

  process.stdout.write(prompt);
  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise<string>((resolve, reject) => {
    let value = "";
    const finish = (result?: string, error?: Error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
      if (error) {
        reject(error);
      } else {
        resolve(result ?? "");
      }
    };
    const onData = (chunk: string | Buffer) => {
      for (const character of String(chunk)) {
        if (character === "\u0003") {
          finish(undefined, new Error("Account provisioning cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish(value);
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (character >= " " && character !== "\u007f") {
          value += character;
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

function safeErrorOutput(error: unknown) {
  const candidate = error as { code?: unknown; statusCode?: unknown };
  return {
    status: "blocked",
    code: typeof candidate?.code === "string" ? candidate.code : "operator_provisioning_failed",
    message: error instanceof Error ? error.message : "Partner account provisioning failed.",
    passwordIncluded: false,
    nextAction: "Resolve the reported conflict or database/configuration issue, inspect existing account state, then retry."
  };
}
