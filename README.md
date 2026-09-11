# PartyLens

Álbum colaborativo dos 15 anos da Julia, com upload público, galeria em tempo real, download em ZIP e busca facial local no navegador.

## Configuração local e produção

1. Crie um projeto no [Supabase](https://supabase.com) e abra o SQL Editor.
2. Execute todo o conteúdo de `supabase/schema.sql`. Ele cria a tabela `photos`, o bucket público `party-photos`, as políticas de acesso e o realtime.
3. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em Project Settings > API.
4. Instale e valide:

```bash
npm install
npm run lint
npm run build
```

5. Para desenvolvimento, use `npm run dev` e abra `http://localhost:3000`.

## Deploy na Vercel

Importe a pasta `partylens` na Vercel, configure as duas variáveis `NEXT_PUBLIC_*` no ambiente de produção e publique. O arquivo `.env.local` não deve ser commitado.

## Busca facial

Os pesos oficiais do `face-api.js` ficam em `public/models`. A selfie é processada somente no dispositivo do convidado; nenhum descriptor facial é salvo no Supabase. A comparação ocorre contra as imagens da galeria carregadas no navegador.

Para uma festa muito grande, mova o cálculo dos descriptors das fotos para um worker/backend dedicado. Para o álbum de uma festa, o processamento no cliente evita armazenar dados biométricos e não exige serviço de reconhecimento pago.
