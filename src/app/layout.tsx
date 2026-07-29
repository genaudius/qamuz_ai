import '../index.css';

export const metadata = {
  title: 'GenAudius',
  description: 'AI Music and Video Generation Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
