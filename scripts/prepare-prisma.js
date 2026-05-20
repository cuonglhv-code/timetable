const fs = require('fs');
const path = require('path');

function preparePrisma() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`[Prisma Setup] Schema file not found at ${schemaPath}`);
    process.exit(1);
  }

  // Load database URL from environment or .env file
  let databaseUrl = process.env.DATABASE_URL;

  // Fallback to reading from .env file if process.env.DATABASE_URL is not set directly
  if (!databaseUrl) {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
      if (match) {
        databaseUrl = match[1];
      }
    }
  }

  if (!databaseUrl) {
    console.log('[Prisma Setup] DATABASE_URL not detected. Defaulting to sqlite provider.');
    databaseUrl = 'file:./dev.db';
  }

  const isPostgres = databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://');
  const provider = isPostgres ? 'postgresql' : 'sqlite';

  console.log(`[Prisma Setup] Detected database connection: ${databaseUrl.split('@')[1] || databaseUrl}`);
  console.log(`[Prisma Setup] Target database provider: ${provider}`);

  let schemaContent = fs.readFileSync(schemaPath, 'utf8');

  // Replace the datasource db block dynamically
  // Regex matches: datasource db { ... }
  const datasourceRegex = /datasource\s+db\s*\{[^}]*\}/g;
  const newDatasource = `datasource db {
  provider = "${provider}"
}`;

  schemaContent = schemaContent.replace(datasourceRegex, newDatasource);

  fs.writeFileSync(schemaPath, schemaContent, 'utf8');
  console.log(`[Prisma Setup] Successfully updated ${schemaPath} to use provider "${provider}"`);
}

preparePrisma();
