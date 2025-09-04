export const metadata = {
  title: 'Telugu Jobs – AP & Telangana',
  description: 'Find fresh jobs across AP & Telangana'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <div className="brand">👜 Telugu Jobs</div>
            <nav style={{display:'flex', gap:10}}>
              <a href="/" className="btn ghost">Home</a>
              <a href="/post-job" className="btn">Post a Job</a>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
