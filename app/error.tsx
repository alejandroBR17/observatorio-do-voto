'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main>
      <section className="panel empty">
        <h1>Não foi possível abrir esta página.</h1>
        <p>Tente novamente. Se o problema continuar, verifique a conexão.</p>
        <button className="button primary" onClick={reset}>
          Tentar novamente
        </button>
      </section>
    </main>
  );
}
