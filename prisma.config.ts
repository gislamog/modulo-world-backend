import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma 7 reads the migration connection URL from here rather than from a
// url field in schema.prisma. The runtime client gets its connection from
// the adapter in PrismaService, not from this file.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Read directly rather than through Prisma's env() helper, which throws
    // when the variable is absent. 'prisma generate' does not need a
    // database, and it runs at image build time where none is configured.
    url: process.env.DATABASE_URL ?? '',
  },
});
