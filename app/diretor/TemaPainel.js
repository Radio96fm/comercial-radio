// Aplica o modo escuro salvo antes de desenhar o painel (sem "piscar").
export default function TemaPainel() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: "try{if(localStorage.getItem('temaPainel')==='escuro'){document.documentElement.dataset.painel='escuro';var m=document.querySelector('meta[name=\"theme-color\"]');m&&m.setAttribute('content','#0f0e0c')}}catch(e){}",
      }}
    />
  );
}
