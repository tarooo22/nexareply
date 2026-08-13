import { seedTechZoneDemo } from "../server/demoSeed";

const organization = await seedTechZoneDemo();
console.log(JSON.stringify({ id: organization.id, slug: organization.slug, mode: organization.mode }));
