import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "TTZ 公会站",
  url: "http://localhost:3000",
  repository: "",
  version: packageJson.version,
  copyright: "© " + currentYear + ", The Twilight Zone.",
  meta: {
    title: "TTZ 公会站 | The Twilight Zone",
    description: "伊森利恩部落 The Twilight Zone 公会活动、报名与出勤工作台。",
  },
};
