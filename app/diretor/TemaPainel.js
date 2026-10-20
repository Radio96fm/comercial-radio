// Aplica o modo escuro antes de desenhar o painel (sem "piscar"). Escuro é o
// padrão; só fica claro quem escolheu o claro no botão do topo.
export default function TemaPainel() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: "try{if(localStorage.getItem('temaPainel')!=='claro'){document.documentElement.dataset.painel='escuro';var m=document.querySelector('meta[name=\"theme-color\"]');m&&m.setAttribute('content','#0f0e0c')}}catch(e){document.documentElement.dataset.painel='escuro'}",
      }}
    />
  );
}
