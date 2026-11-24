import { Platform, Share } from 'react-native';

import { ATRIBUTO_NOMES, ATRIBUTOS, Ficha, PERICIAS } from '@/types/ficha';
import {
  bonusPericia,
  bonusProficiencia,
  bonusSalvaguarda,
  cdMagia,
  fmt,
  iniciativa,
  modificador,
  percepcaoPassiva,
} from '@/utils/calc';

export async function imprimirOuExportarFicha(f: Ficha) {
  const pb = bonusProficiencia(f.nivel);
  const cd = cdMagia(f);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const attrsHtml = ATRIBUTOS.map(
      (k) =>
        `<div class="box"><strong>${ATRIBUTO_NOMES[k]}</strong><div class="big">${fmt(modificador(f.atributos[k]))}</div><small>${f.atributos[k]}</small></div>`,
    ).join('');

    const periciasHtml = PERICIAS.map(
      (p) =>
        `<div>${(f.pericias[p.key] ?? 0) > 0 ? '●' : '○'} <strong>${fmt(bonusPericia(f, p.key))}</strong> ${p.nome}</div>`,
    ).join('');

    const ataquesHtml = (f.ataques ?? [])
      .map(
        (a) =>
          `<tr><td><strong>${a.nome}</strong></td><td>${a.bonus}</td><td>${a.dano} ${a.tipoDano ?? ''}</td><td>${a.alcance ?? '-'}</td></tr>`,
      )
      .join('');

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ficha D&D 5e - ${f.titulo}</title>
  <style>
    body { font-family: Georgia, serif; color: #111; margin: 24px; }
    h1 { margin: 0 0 4px 0; color: #9B1C2E; }
    .sub { color: #555; margin-bottom: 16px; }
    .grid6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 16px; }
    .box { border: 1.5px solid #333; border-radius: 10px; padding: 8px; text-align: center; }
    .big { font-size: 24px; font-weight: bold; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border-bottom: 1px solid #ccc; padding: 6px; text-align: left; }
    .sec { border: 1px solid #bbb; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
    h3 { margin: 0 0 8px 0; color: #9B1C2E; text-transform: uppercase; font-size: 13px; }
  </style>
</head>
<body>
  <h1>${f.titulo}</h1>
  <div class="sub">${[f.raca, f.classe, f.subclasse, `Nível ${f.nivel}`, f.antecedente].filter(Boolean).join(' · ')}</div>
  <div class="grid6">${attrsHtml}</div>
  <div class="grid6">
    <div class="box"><strong>PV</strong><div class="big">${f.pv.atual}/${f.pv.total}</div></div>
    <div class="box"><strong>CA</strong><div class="big">${f.ca}</div></div>
    <div class="box"><strong>Iniciativa</strong><div class="big">${fmt(iniciativa(f))}</div></div>
    <div class="box"><strong>Desloc.</strong><div class="big">${f.deslocamento}m</div></div>
    <div class="box"><strong>Proficiência</strong><div class="big">${fmt(pb)}</div></div>
    <div class="box"><strong>Percep. Passiva</strong><div class="big">${percepcaoPassiva(f)}</div></div>
  </div>
  <div class="cols">
    <div>
      <div class="sec">
        <h3>Testes de Resistência</h3>
        ${ATRIBUTOS.map((k) => `<div>${f.salvaguardas[k] ? '●' : '○'} <strong>${fmt(bonusSalvaguarda(f, k))}</strong> ${ATRIBUTO_NOMES[k]}</div>`).join('')}
      </div>
      <div class="sec">
        <h3>Perícias</h3>
        ${periciasHtml}
      </div>
    </div>
    <div>
      <div class="sec">
        <h3>Ataques e Magias (${cd ? `CD Magia ${cd}` : 'Combate'})</h3>
        <table><thead><tr><th>Nome</th><th>Bônus</th><th>Dano</th><th>Alcance</th></tr></thead><tbody>${ataquesHtml}</tbody></table>
      </div>
      <div class="sec">
        <h3>Equipamento & Moedas</h3>
        <div><strong>Moedas:</strong> PC ${f.moedas?.pc ?? 0} · PP ${f.moedas?.pp ?? 0} · PE ${f.moedas?.pe ?? 0} · PO ${f.moedas?.po ?? 0} · PL ${f.moedas?.pl ?? 0}</div>
        <ul>${(f.itensEquipamento ?? []).map((i) => `<li><strong>${i.nome}</strong> (x${i.qtd ?? 1}) ${i.descricao ? `- ${i.descricao}` : ''}</li>`).join('')}</ul>
      </div>
      <div class="sec">
        <h3>Habilidades, Traços e Talentos</h3>
        <ul>${(f.caracteristicas ?? []).map((c) => `<li><strong>${c.nome}</strong> (${c.origem ?? ''}): ${c.descricao ?? ''}</li>`).join('')}</ul>
      </div>
    </div>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
    return;
  }

  const resumoTexto = [
    `=== ${f.titulo} (${[f.raca, f.classe, `Nv ${f.nivel}`].filter(Boolean).join(' · ')}) ===`,
    `PV: ${f.pv.atual}/${f.pv.total} | CA: ${f.ca} | Inic: ${fmt(iniciativa(f))} | Desloc: ${f.deslocamento}m`,
    ATRIBUTOS.map((k) => `${ATRIBUTO_NOMES[k]}: ${f.atributos[k]} (${fmt(modificador(f.atributos[k]))})`).join(' | '),
  ].join('\n');

  await Share.share({ title: `Ficha - ${f.titulo}`, message: resumoTexto }).catch(() => {});
}
