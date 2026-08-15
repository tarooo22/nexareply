import { seedAmadeoDemo } from "../server/demoSeed";

const organization = await seedAmadeoDemo();
console.log(JSON.stringify({ id: organization.id, slug: organization.slug, mode: organization.mode }));
