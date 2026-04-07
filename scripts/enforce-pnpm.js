const userAgent = process.env.npm_config_user_agent || "";

if (!userAgent.includes("pnpm/")) {
    console.error("\nThis repository must be installed with pnpm.");
    console.error("Run: pnpm install\n");
    process.exit(1);
}
