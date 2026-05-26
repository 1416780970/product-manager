import "./globals.css";

export const metadata = {
  title: "个人产品物流管理系统",
  description: "产品、采购、亚马逊物流管理",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
