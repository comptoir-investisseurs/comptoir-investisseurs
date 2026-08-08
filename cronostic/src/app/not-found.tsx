import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-5 py-32 text-center">
      <p className="surtitre">Erreur 404</p>
      <h1 className="titre mt-5 text-4xl text-ivoire">Cette page n&apos;existe pas.</h1>
      <p className="mt-5 text-parchemin/70">
        Le calibre recherché n&apos;est peut-être pas encore au catalogue.
      </p>
      <Link
        href="/calibres"
        className="mt-10 inline-block border border-laiton/50 px-6 py-3 text-[0.8rem] tracking-[0.16em] text-laiton-clair uppercase transition-colors hover:bg-laiton/10"
      >
        Voir les calibres
      </Link>
    </div>
  );
}
