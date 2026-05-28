#!/usr/bin/env node
/**
 * Admin kullanıcısı oluşturur veya mevcut kullanıcıyı ADMIN yapar.
 *
 * Kullanım:
 *   node scripts/create-admin.js
 *   node scripts/create-admin.js admin@example.com MyPassword123
 */

const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const email    = process.argv[2] || "admin@joinaireligion.com";
const password = process.argv[3] || "Admin1234!";

function hashPassword(pw) {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

async function main() {
  console.log("\n🔑 Admin kullanıcısı oluşturuluyor...");
  console.log(`   Email   : ${email}`);
  console.log(`   Şifre   : ${password}`);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    // Mevcut kullanıcıyı ADMIN yap
    const updated = await prisma.user.update({
      where: { email },
      data: {
        role:            "ADMIN",
        passwordHash:    hashPassword(password),
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      },
    });
    console.log(`\n✅ Mevcut kullanıcı ADMIN yapıldı: ${updated.email}`);
  } else {
    // Yeni admin kullanıcısı oluştur
    const created = await prisma.user.create({
      data: {
        email,
        displayName:     "Admin",
        passwordHash:    hashPassword(password),
        role:            "ADMIN",
        emailVerifiedAt: new Date(),
        preferredLocale: "en",
      },
    });
    console.log(`\n✅ Admin kullanıcısı oluşturuldu: ${created.email}`);
  }

  console.log("\n🌐 Admin paneline giriş:");
  console.log("   URL   : http://localhost:3000/admin/login");
  console.log(`   Email : ${email}`);
  console.log(`   Şifre : ${password}`);
  console.log("");
}

main()
  .catch((e) => { console.error("Hata:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
