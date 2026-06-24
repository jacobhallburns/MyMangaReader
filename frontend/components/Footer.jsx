import Link from 'next/link';

export default function SiteFooter() {
    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                <nav className="legal-links" aria-label="Legal links">
                    <Link href="/privacy">Privacy Policy</Link>
                    <Link href="/terms">Terms</Link>
                    <a href="mailto:mymangareadercontact@gmail.com">Contact</a>
                </nav>

                <p className="copyright">
                    © {new Date().getFullYear()} MyMangaReader.
                </p>
            </div>
        </footer>
    );
}