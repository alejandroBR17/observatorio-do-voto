const retired = () =>
  Response.json(
    {
      error:
        'As salas foram substituídas pelo acompanhamento pessoal. Dados oficiais continuam públicos.',
    },
    { status: 410 },
  );
export const GET = retired;
export const POST = retired;
export const PATCH = retired;
