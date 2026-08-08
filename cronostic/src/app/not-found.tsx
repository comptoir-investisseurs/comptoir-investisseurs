import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-32 text-center">
      <p className="surtitre">Erreur 404</p>
      <h1 className="titre mt-5 text-couverture text-encre">Cette page n&apos;existe pas.</h1>
      <p className="mt-5 text-encre/72">
        Le calibre recherché n&apos;est peut-être pas encore au catalogue.
      </p>
      <Link
        href="/calibres"
        className="mt-10 inline-block border border-laiton px-6 py-3 text-[0.8rem] tracking-[0.16em] text-laiton uppercase transition-colors hover:bg-papier"
      >
        Voir les calibres
      </Link>
    </div>
  );
}
