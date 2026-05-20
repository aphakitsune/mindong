import "dotenv/config";
import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // Chỉ để duy nhất thuộc tính này ở đây để phục vụ Prisma Migrate/CLI
    url: "postgresql://neondb_owner:npg_V4tK2YuAHRrB@ep-soft-truth-ao2tn4fj-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
});