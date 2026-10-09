import type { Metadata } from "next";
import "./globals.css";
import "./redesign.css";
import "./motion.css";

const origin=process.env.SITE_URL||(process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:process.env.VERCEL_URL?'https://'+process.env.VERCEL_URL:'https://observatorio-voto.vercel.app');
export const metadata:Metadata={
 metadataBase:new URL(origin),title:{default:'Observatório do Voto • Eleições presidenciais',template:'%s | Observatório do Voto'},description:'O Brasil, voto a voto. Dados oficiais, história, pesquisas e acompanhamento eleitoral.',applicationName:'Observatório do Voto',manifest:'/manifest.webmanifest',
 icons:{icon:[{url:'/favicon.ico',sizes:'any'},{url:'/favicon.svg',type:'image/svg+xml'}],apple:[{url:'/apple-touch-icon.png',sizes:'180x180',type:'image/png'}]},
 openGraph:{type:'website',locale:'pt_BR',siteName:'Observatório do Voto',title:'Observatório do Voto',description:'O Brasil, voto a voto. Dados oficiais, pesquisas e história eleitoral.',images:[{url:'/og-image.png',width:1200,height:630,alt:'Observatório do Voto — O Brasil, voto a voto.'}]},
 twitter:{card:'summary_large_image',title:'Observatório do Voto',images:['/og-image.png']},appleWebApp:{capable:true,title:'Observatório',statusBarStyle:'default'},
};
export const viewport={width:'device-width',initialScale:1,themeColor:[{media:'(prefers-color-scheme: light)',color:'#f4f2ec'},{media:'(prefers-color-scheme: dark)',color:'#14283d'}]};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"(()=>{let t='system';try{t=JSON.parse(localStorage.getItem('observatorio.preferences')||'{}').theme||'system'}catch{}document.documentElement.dataset.theme=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'})()"}}/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
