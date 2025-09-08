// Simulador de Alíquotas e Taxas — Cristino Castro/PI
// Este script torna o simulador funcional quando usado com o index.html e styles.css no mesmo diretório.

(function(){
  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Parser robusto para números com vírgula ou ponto
  function parseNumber(v){
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    let s = String(v).trim();
    if (!s) return 0;
    s = s.replace(/\s|\u00A0/g, "");
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot){
      const lastComma = s.lastIndexOf(",");
      const lastDot = s.lastIndexOf(".");
      if (lastComma > lastDot){
        s = s.replace(/\./g, "");
        s = s.replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (hasComma){
      const parts = s.split(",");
      if (parts.length === 2){
        if (parts[1].length !== 3){
          s = parts[0] + "." + parts[1];
        } else {
          s = parts[0] + parts[1];
        }
      } else {
        s = s.replace(/,/g, "");
      }
    } else if (hasDot){
      const dotCount = (s.match(/\./g) || []).length;
      if (dotCount === 1){
        const [intPart, fracPart=""] = s.split(".");
        if (fracPart.length === 3 && intPart.length <= 3){
          s = intPart + fracPart;
        }
      } else {
        const last = s.lastIndexOf(".");
        const decimals = s.length - last - 1;
        if (decimals >= 1 && decimals <= 2){
          s = s.replace(/\.(?=.*\.)/g, "");
        } else {
          s = s.replace(/\./g, "");
        }
      }
    }
    const n = Number(s);
    return isNaN(n) ? 0 : n;
  }

  function formatBRL(n){
    const safe = Number.isFinite(n) ? n : 0;
    return BRL.format(safe < 0 ? 0 : safe);
  }

  // Dados dos tributos e taxas
  const TAXES = [
    // IPTU
    {
      id: "iptu",
      name: "IPTU",
      baseLabel: "Valor venal do imóvel (PGV)",
      formula: "percent_of_base",
      rate: null,
      period: "Anual",
      notes: "Informe a alíquota aplicável conforme legislação."
    },
    // ISS Autônomo
    { id:"iss_auto_sup",name:"ISS - Autônomo Nível Superior",formula:"fixed",amount:1800,period:"Anual",baseLabel:"Profissional liberal" },
    { id:"iss_auto_med",name:"ISS - Autônomo Nível Médio",formula:"fixed",amount:500,period:"Anual",baseLabel:"Profissional liberal" },
    { id:"iss_auto_fund",name:"ISS - Autônomo Nível Fundamental",formula:"fixed",amount:250,period:"Anual",baseLabel:"Profissional liberal" },
    // ISS PJ
    { id:"iss_pj",name:"ISS - Pessoa Jurídica",formula:"percent_of_base",rate:0.05,period:"Sobre receita bruta",baseLabel:"Receita Bruta de Serviços" },
    // Taxa Funcionamento (faixas)
    { id:"func_1",name:"Taxa Funcionamento (até 30 m²)",formula:"area_fixed",min:0,max:30,amount:100,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_2",name:"Taxa Funcionamento (30 a 60 m²)",formula:"area_fixed",min:30,max:60,amount:280,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_3",name:"Taxa Funcionamento (60 a 120 m²)",formula:"area_fixed",min:60,max:120,amount:360,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_4",name:"Taxa Funcionamento (120 a 200 m²)",formula:"area_fixed",min:120,max:200,amount:420,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_5",name:"Taxa Funcionamento (200 a 260 m²)",formula:"area_fixed",min:200,max:260,amount:550,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_6",name:"Taxa Funcionamento (260 a 400 m²)",formula:"area_fixed",min:260,max:400,amount:860,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_7",name:"Taxa Funcionamento (400 a 550 m²)",formula:"area_fixed",min:400,max:550,amount:1000,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_8",name:"Taxa Funcionamento (550 a 700 m²)",formula:"area_fixed",min:550,max:700,amount:1100,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_9",name:"Taxa Funcionamento (700 a 1.000 m²)",formula:"area_fixed",min:700,max:1000,amount:1200,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_10",name:"Taxa Funcionamento (1.000 a 1.200 m²)",formula:"area_fixed",min:1000,max:1200,amount:1320.72,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_11",name:"Taxa Funcionamento (1.200 a 1.500 m²)",formula:"area_fixed",min:1200,max:1500,amount:1651.16,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_12",name:"Taxa Funcionamento (1.500 a 1.800 m²)",formula:"area_fixed",min:1500,max:1800,amount:1980.57,period:"Anual",baseLabel:"Área do Estabelecimento" },
    { id:"func_13",name:"Taxa Funcionamento (1.800 a 2.100 m²)",formula:"area_fixed",min:1800,max:2100,amount:2312.03,period:"Anual",baseLabel:"Área do Estabelecimento" },
    // Usina/Microgeração
    { id:"func_usina",name:"Taxa Funcionamento - Usina Energia Renovável (Grande Porte)",formula:"fixed",amount:540000,period:"Anual",baseLabel:"Instalação" },
    { id:"func_micro",name:"Taxa Funcionamento - Microgeração Renovável",formula:"range_fixed",minAmount:1000,maxAmount:5000,period:"Anual",baseLabel:"Unidade Instalada" },
    // Autônomos Funcionamento
    { id:"func_auto_sup",name:"Taxa Funcionamento - Autônomo Nível Superior",formula:"fixed",amount:600,period:"Anual",baseLabel:"Profissional Liberal" },
    { id:"func_auto_tec",name:"Taxa Funcionamento - Autônomo Nível Técnico",formula:"fixed",amount:250,period:"Anual",baseLabel:"Profissional Liberal" },
    { id:"func_auto_fund",name:"Taxa Funcionamento - Autônomo Nível Fundamental",formula:"fixed",amount:80,period:"Anual",baseLabel:"Profissional Liberal" },
    // Barracas
    { id:"func_barraca",name:"Taxa Funcionamento - Barracas",formula:"fixed",amount:50,period:"Diária",baseLabel:"Por dia" },
    // Circos/Parques
    { id:"func_circo_1",name:"Taxa Funcionamento - Circos/Parques (até 1.000 m²)",formula:"area_fixed",min:0,max:1000,amount:20,period:"Diária",baseLabel:"Área ocupada" },
    { id:"func_circo_2",name:"Taxa Funcionamento - Circos/Parques (1.000 a 5.000 m²)",formula:"area_fixed",min:1000,max:5000,amount:30,period:"Diária",baseLabel:"Área ocupada" },
    { id:"func_circo_3",name:"Taxa Funcionamento - Circos/Parques (acima de 5.000 m²)",formula:"area_fixed",min:5000,max:Infinity,amount:50,period:"Diária",baseLabel:"Área ocupada" },
    // Feiras
    { id:"func_feira_1",name:"Taxa Funcionamento - Feiras (até 1.000 m²)",formula:"area_fixed",min:0,max:1000,amount:50,period:"Diária",baseLabel:"Área ocupada" },
    { id:"func_feira_2",name:"Taxa Funcionamento - Feiras (1.000 a 10.000 m²)",formula:"area_fixed",min:1000,max:10000,amount:100,period:"Diária",baseLabel:"Área ocupada" },
    { id:"func_feira_3",name:"Taxa Funcionamento - Feiras (acima de 10.000 m²)",formula:"area_fixed",min:10000,max:Infinity,amount:200,period:"Diária",baseLabel:"Área ocupada" },
    // Festejos/Eventos
    { id:"func_eventos",name:"Taxa Funcionamento - Festejos/Eventos",formula:"per_m2",rate:0.04,period:"Diária",baseLabel:"Área ocupada" },
    // Food Truck
    { id:"func_foodtruck",name:"Taxa Funcionamento - Food Truck",formula:"per_m2",rate:0.36,period:"Diária",baseLabel:"Área ocupada" },
    // Quiosques
    { id:"func_quiosque",name:"Taxa Funcionamento - Quiosques",formula:"per_m2",rate:9.26,period:"Mensal",baseLabel:"Área pública" },
    // Caçambas
    { id:"func_cacamba_caminhao",name:"Taxa Funcionamento - Caçambas c/ Caminhão",formula:"fixed",amount:500,period:"Anual",baseLabel:"Conjunto" },
    { id:"func_cacamba_sem",name:"Taxa Funcionamento - Caçambas s/ Caminhão",formula:"fixed",amount:150,period:"Anual",baseLabel:"Unidade" },
    // Obras
    { id:"obras_alinhamento",name:"Taxa Obras - Revisão de Alinhamento",formula:"fixed_plus_extra",amount:60,period:"Por processo",baseLabel:"Urbano/Rural",notes:"R$ 60,00 + acréscimos" },
    { id:"obras_consulta",name:"Taxa Obras - Consulta Prévia",formula:"per_m2_range",minRate:0.50,maxRate:0.80,period:"Por processo",baseLabel:"Área analisada" },
    { id:"obras_alvara_resid",name:"Taxa Obras - Alvará Construção Residencial",formula:"per_m2_range",minRate:0.30,maxRate:0.40,period:"Por obra",baseLabel:"Área construída" },
    { id:"obras_alvara_comercial",name:"Taxa Obras - Alvará Construção Comercial",formula:"per_m2_cap",rate:0.50,cap:10000,period:"Por obra",baseLabel:"Área construída",notes:"Até R$ 10.000,00" },
    { id:"obras_habite_se_resid",name:"Taxa Obras - Habite-se Residencial",formula:"per_m2",rate:0.20,period:"Por obra",baseLabel:"Área construída" },
    { id:"obras_habite_se_com",name:"Taxa Obras - Habite-se Comercial",formula:"per_m2",rate:0.30,period:"Por obra",baseLabel:"Área construída" },
    { id:"obras_outras",name:"Taxa Obras - Outras Licenças",formula:"per_m2_or_fixed",minRate:0.10,maxRate:2.00,minAmount:100,maxAmount:500,period:"Por obra",baseLabel:"Diversas obras" },
    // Resíduos Imóvel construído
    { id:"res_constr_1",name:"Taxa Resíduos (até 50 m²), Imóvel construído",formula:"area_fixed",min:0,max:50,amount:0,period:"Mensal",baseLabel:"Imóvel construído",notes:"Isento" },
    { id:"res_constr_2",name:"Taxa Resíduos (51 a 100 m²), Imóvel construído",formula:"area_fixed",min:50,max:100,amount:15,period:"Mensal",baseLabel:"Imóvel construído" },
    { id:"res_constr_3",name:"Taxa Resíduos (101 a 150 m²), Imóvel construído",formula:"area_fixed",min:100,max:150,amount:20,period:"Mensal",baseLabel:"Imóvel construído" },
    { id:"res_constr_4",name:"Taxa Resíduos (151 a 200 m²), Imóvel construído",formula:"area_fixed",min:150,max:200,amount:25,period:"Mensal",baseLabel:"Imóvel construído" },
    { id:"res_constr_5",name:"Taxa Resíduos (201 a 250 m²), Imóvel construído",formula:"area_fixed",min:200,max:250,amount:30,period:"Mensal",baseLabel:"Imóvel construído" },
    { id:"res_constr_6",name:"Taxa Resíduos (251 a 300 m²), Imóvel construído",formula:"area_fixed",min:250,max:300,amount:35,period:"Mensal",baseLabel:"Imóvel construído" },
    { id:"res_constr_7",name:"Taxa Resíduos (301 a 500 m²), Imóvel construído",formula:"area_fixed",min:300,max:500,amount:50,period:"Mensal",baseLabel:"Imóvel construído" },
    { id:"res_constr_8",name:"Taxa Resíduos (501 a 1000 m²), Imóvel construído",formula:"area_fixed",min:500,max:1000,amount:60,period:"Mensal",baseLabel:"Imóvel construído" },
    { id:"res_constr_9",name:"Taxa Resíduos (1001+ m²), Imóvel construído",formula:"area_fixed",min:1000,max:Infinity,amount:100,period:"Mensal",baseLabel:"Imóvel construído" },
    // Resíduos Imóvel sem construção
    { id:"res_sem_1",name:"Taxa Resíduos (até 50 m²), Imóvel sem construção",formula:"area_fixed",min:0,max:50,amount:0,period:"Mensal",baseLabel:"Imóvel sem construção",notes:"Isento" },
    { id:"res_sem_2",name:"Taxa Resíduos (51 a 100 m²), Imóvel sem construção",formula:"area_fixed",min:50,max:100,amount:40,period:"Mensal",baseLabel:"Imóvel sem construção" },
    { id:"res_sem_3",name:"Taxa Resíduos (101 a 150 m²), Imóvel sem construção",formula:"area_fixed",min:100,max:150,amount:45,period:"Mensal",baseLabel:"Imóvel sem construção" },
    { id:"res_sem_4",name:"Taxa Resíduos (151 a 200 m²), Imóvel sem construção",formula:"area_fixed",min:150,max:200,amount:55,period:"Mensal",baseLabel:"Imóvel sem construção" },
    { id:"res_sem_5",name:"Taxa Resíduos (201 a 250 m²), Imóvel sem construção",formula:"area_fixed",min:200,max:250,amount:65,period:"Mensal",baseLabel:"Imóvel sem construção" },
    { id:"res_sem_6",name:"Taxa Resíduos (251 a 300 m²), Imóvel sem construção",formula:"area_fixed",min:250,max:300,amount:75,period:"Mensal",baseLabel:"Imóvel sem construção" },
    { id:"res_sem_7",name:"Taxa Resíduos (301 a 500 m²), Imóvel sem construção",formula:"area_fixed",min:300,max:500,amount:120,period:"Mensal",baseLabel:"Imóvel sem construção" },
    { id:"res_sem_8",name:"Taxa Resíduos (501 a 1000 m²), Imóvel sem construção",formula:"area_fixed",min:500,max:1000,amount:150,period:"Mensal",baseLabel:"Imóvel sem construção" },
    { id:"res_sem_9",name:"Taxa Resíduos (1001+ m²), Imóvel sem construção",formula:"area_fixed",min:1000,max:Infinity,amount:180,period:"Mensal",baseLabel:"Imóvel sem construção" }
  ];

  document.addEventListener("DOMContentLoaded", () => {
    const taxSelect = document.getElementById("taxSelect");
    const paramsArea = document.getElementById("paramsArea");
    const taxMeta = document.getElementById("taxMeta");
    const adjustRange = document.getElementById("adjustPercent");
    const adjustLabel = document.getElementById("adjustLabel");
    const resultValue = document.getElementById("resultValue");
    const resultPeriod = document.getElementById("resultPeriod");
    const resultDetails = document.getElementById("resultDetails");

    let currentTax = null;

    function populateTaxes(){
      taxSelect.innerHTML = "";
      TAXES.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name;
        taxSelect.appendChild(opt);
      });
    }

    function makeField(id, label, type="text", attrs={}){
      const wrap = document.createElement("div"); wrap.className="field";
      const lab = document.createElement("label"); lab.setAttribute("for", id); lab.textContent = label;
      const inp = document.createElement("input");
      inp.id = id; inp.name = id; inp.type = type;
      inp.inputMode = "decimal";
      inp.pattern = "[0-9.,\\s]+";
      inp.placeholder = attrs.placeholder || "Ex.: 1000,50 ou 1000.50";
      if (attrs.min != null) inp.min = attrs.min;
      if (attrs.max != null) inp.max = attrs.max;
      if (attrs.step != null) inp.step = attrs.step;
      if (attrs.value != null) inp.value = attrs.value;
      inp.autocomplete = "off";
      wrap.appendChild(lab);
      wrap.appendChild(inp);
      if (attrs.help){
        const help = document.createElement("div"); help.className="help"; help.textContent = attrs.help;
        wrap.appendChild(help);
      }
      return { wrap, input: inp };
    }

    function makeRange(id, label, min, max, step, value, help){
      const wrap = document.createElement("div"); wrap.className="field";
      const lab = document.createElement("label"); lab.setAttribute("for", id); lab.textContent = label;
      const inp = document.createElement("input");
      inp.id = id; inp.name = id; inp.type = "range";
      inp.min = String(min); inp.max = String(max); inp.step = String(step); inp.value = String(value);
      wrap.appendChild(lab); wrap.appendChild(inp);
      if (help){
        const h = document.createElement("div"); h.className="help"; h.textContent = help; wrap.appendChild(h);
      }
      return { wrap, input: inp };
    }

    function resetParams(){ paramsArea.innerHTML = ""; }

    function onTaxChange(){
      const id = taxSelect.value;
      currentTax = TAXES.find(t => t.id === id) || null;
      adjustRange.value = "0";
      adjustLabel.textContent = "0%";
      renderParams();
      updateResult();
    }

    function renderParams(){
      resetParams();
      if (!currentTax){ taxMeta.textContent=""; return; }
      taxMeta.textContent = [
        currentTax.baseLabel ? `Base de cálculo: ${currentTax.baseLabel}` : null,
        currentTax.period ? `Periodicidade: ${currentTax.period}` : null,
        currentTax.notes ? `Obs.: ${currentTax.notes}` : null,
      ].filter(Boolean).join(" • ");

      switch (currentTax.formula){
        case "fixed": {
          const div = document.createElement("div");
          div.className="help";
          div.textContent = `Valor fixo de ${formatBRL(currentTax.amount)} (${currentTax.period}).`;
          paramsArea.appendChild(div);
          break;
        }
        case "range_fixed": {
          const slider = makeRange(
            "rangeFixed",
            "Escolha o valor (R$)",
            currentTax.minAmount,
            currentTax.maxAmount,
            10,
            currentTax.minAmount,
            `Valor selecionado: ${formatBRL(currentTax.minAmount)}`
          );
          const out = document.createElement("div"); out.className="help"; out.id="rangeFixedOut";
          out.textContent = `Valor selecionado: ${formatBRL(currentTax.minAmount)}`;
          slider.input.addEventListener("input", () => {
            const v = parseNumber(slider.input.value);
            out.textContent = `Valor selecionado: ${formatBRL(v)}`;
            updateResult();
          });
          paramsArea.appendChild(slider.wrap);
          paramsArea.appendChild(out);
          break;
        }
        case "fixed_plus_extra": {
          const extra = makeField("extraAmount", "Acréscimos (R$)", "text", { value: "0", help: "Informe os acréscimos se houver." });
          paramsArea.appendChild(extra.wrap);
          extra.input.addEventListener("input", updateResult);
          break;
        }
        case "percent_of_base": {
          const base = makeField("baseValue", currentTax.baseLabel || "Base (R$)", "text", {});
          paramsArea.appendChild(base.wrap);
          base.input.addEventListener("input", updateResult);
          const rateField = makeField("rateValue", "Alíquota (%)", "text", {
            value: currentTax.rate != null ? String((currentTax.rate*100).toFixed(2)).replace(".", ",") : "",
            help: currentTax.rate != null ? "Alíquota padrão para simulação; altere para testar cenários." : "Informe a alíquota para simular."
          });
          paramsArea.appendChild(rateField.wrap);
          rateField.input.addEventListener("input", updateResult);
          break;
        }
        case "area_fixed": {
          const area = makeField("areaValue", currentTax.baseLabel || "Área (m²)", "text", { help: `Informe a área para validar a faixa (${currentTax.min+1} a ${currentTax.max === Infinity ? "∞" : currentTax.max} m²).` });
          paramsArea.appendChild(area.wrap);
          area.input.addEventListener("input", updateResult);
          break;
        }
        case "per_m2": {
          const area = makeField("areaValue", currentTax.baseLabel || "Área (m²)", "text", {});
          paramsArea.appendChild(area.wrap);
          area.input.addEventListener("input", updateResult);
          break;
        }
        case "per_m2_range": {
          const area = makeField("areaValue", currentTax.baseLabel || "Área (m²)", "text", {});
          paramsArea.appendChild(area.wrap);
          area.input.addEventListener("input", updateResult);
          const initialRate = currentTax.minRate;
          const rate = makeRange("perM2Rate", "Valor por m² (R$)", currentTax.minRate, currentTax.maxRate, 0.01, initialRate, `Valor por m²: ${formatBRL(initialRate)}`);
          const out = document.createElement("div"); out.className="help"; out.id="perM2Out";
          out.textContent = `Valor por m²: ${formatBRL(initialRate)}`;
          paramsArea.appendChild(rate.wrap);
          paramsArea.appendChild(out);
          rate.input.addEventListener("input", ()=>{
            const v = parseNumber(rate.input.value);
            out.textContent = `Valor por m²: ${formatBRL(v)}`;
            updateResult();
          });
          break;
        }
        case "per_m2_cap": {
          const area = makeField("areaValue", currentTax.baseLabel || "Área (m²)", "text", { help: `Limite máximo: ${formatBRL(currentTax.cap)}.` });
          paramsArea.appendChild(area.wrap);
          area.input.addEventListener("input", updateResult);
          break;
        }
        case "per_m2_or_fixed": {
          const typeSel = document.createElement("select");
          typeSel.id = "eitherType";
          ["Por m²","Valor fixo"].forEach((t,i) => {
            const op = document.createElement("option");
            op.value = i === 0 ? "m2" : "fixo";
            op.textContent = t;
            typeSel.appendChild(op);
          });
          const wrapSel = document.createElement("div"); wrapSel.className="field";
          const labSel = document.createElement("label"); labSel.textContent = "Tipo de cobrança";
          wrapSel.appendChild(labSel); wrapSel.appendChild(typeSel);
          paramsArea.appendChild(wrapSel);

          const m2Area = makeField("eitherArea", currentTax.baseLabel || "Área (m²)", "text", {});
          const initialRate = currentTax.minRate;
          const m2Rate = makeRange("eitherRate", "Valor por m² (R$)", currentTax.minRate, currentTax.maxRate, 0.01, initialRate, `Valor por m²: ${formatBRL(initialRate)}`);
          const m2Out = document.createElement("div"); m2Out.className="help"; m2Out.id="eitherRateOut";
          m2Out.textContent = `Valor por m²: ${formatBRL(initialRate)}`;
          const fixRange = makeRange("eitherFixed", "Valor fixo (R$)", currentTax.minAmount, currentTax.maxAmount, 1, currentTax.minAmount, `Valor fixo: ${formatBRL(currentTax.minAmount)}`);
          const fixOut = document.createElement("div"); fixOut.className="help"; fixOut.id="eitherFixedOut";
          fixOut.textContent = `Valor fixo: ${formatBRL(currentTax.minAmount)}`;

          function renderEither(){
            [m2Area.wrap, m2Rate.wrap, m2Out, fixRange.wrap, fixOut].forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
            if (typeSel.value === "m2"){
              paramsArea.appendChild(m2Area.wrap);
              paramsArea.appendChild(m2Rate.wrap);
              paramsArea.appendChild(m2Out);
            } else {
              paramsArea.appendChild(fixRange.wrap);
              paramsArea.appendChild(fixOut);
            }
            updateResult();
          }
          typeSel.addEventListener("change", renderEither);
          [m2Area.input, m2Rate.input, fixRange.input].forEach(inp => inp.addEventListener("input", ()=>{
            if (inp === m2Rate.input) m2Out.textContent = `Valor por m²: ${formatBRL(parseNumber(m2Rate.input.value))}`;
            if (inp === fixRange.input) fixOut.textContent = `Valor fixo: ${formatBRL(parseNumber(fixRange.input.value))}`;
            updateResult();
          }));
          renderEither();
          break;
        }
      }
    }

    function getAdjustMultiplier(){
      const p = parseNumber(adjustRange.value) || 0;
      return 1 + (p/100);
    }

    function updateResult(){
      if (!currentTax){
        resultValue.textContent = "—";
        resultPeriod.textContent = "—";
        resultDetails.textContent = "—";
        return;
      }
      const adj = getAdjustMultiplier();
      const pLabel = `${adjustRange.value}%`;
      adjustLabel.textContent = pLabel;
      let amount = 0;
      const details = [];

      switch (currentTax.formula){
        case "fixed": {
          amount = currentTax.amount * adj;
          details.push(`Valor fixo ${formatBRL(currentTax.amount)} x ajuste ${pLabel}`);
          break;
        }
        case "range_fixed": {
          const v = parseNumber(document.getElementById("rangeFixed")?.value);
          amount = v * adj;
          details.push(`Valor selecionado ${formatBRL(v)} x ajuste ${pLabel}`);
          break;
        }
        case "fixed_plus_extra": {
          const extra = parseNumber(document.getElementById("extraAmount")?.value);
          amount = (currentTax.amount + extra) * adj;
          details.push(`Base ${formatBRL(currentTax.amount)} + acréscimos ${formatBRL(extra)} x ajuste ${pLabel}`);
          break;
        }
        case "percent_of_base": {
          const base = parseNumber(document.getElementById("baseValue")?.value);
          let rateInput = parseNumber(document.getElementById("rateValue")?.value);
          let rate = currentTax.rate != null ? currentTax.rate : (rateInput ? rateInput/100 : 0);
          amount = base * rate * adj;
          details.push(`Base ${formatBRL(base)} x alíquota ${(rate*100).toFixed(2)}% x ajuste ${pLabel}`);
          break;
        }
        case "area_fixed": {
          const area = parseNumber(document.getElementById("areaValue")?.value);
          const min = currentTax.min;
          const max = currentTax.max;
          if ((area > min && area <= max) || (max === Infinity && area > min)){
            amount = currentTax.amount * adj;
            details.push(`Faixa válida para área ${area} m²: ${formatBRL(currentTax.amount)} x ajuste ${pLabel}`);
          } else {
            details.push(`Informe área entre ${min+1} e ${max === Infinity ? "∞" : max} m² para esta faixa.`);
          }
          break;
        }
        case "per_m2": {
          const area = parseNumber(document.getElementById("areaValue")?.value);
          amount = area * currentTax.rate * adj;
          details.push(`Área ${area} m² x ${formatBRL(currentTax.rate)} por m² x ajuste ${pLabel}`);
          break;
        }
        case "per_m2_range": {
          const area = parseNumber(document.getElementById("areaValue")?.value);
          const rate = parseNumber(document.getElementById("perM2Rate")?.value);
          amount = area * rate * adj;
          details.push(`Área ${area} m² x ${formatBRL(rate)} por m² x ajuste ${pLabel}`);
          break;
        }
        case "per_m2_cap": {
          const area = parseNumber(document.getElementById("areaValue")?.value);
          let total = area * currentTax.rate;
          if (total > currentTax.cap) total = currentTax.cap;
          amount = total * adj;
          details.push(`Área ${area} m² x ${formatBRL(currentTax.rate)} por m², limitado a ${formatBRL(currentTax.cap)} x ajuste ${pLabel}`);
          break;
        }
        case "per_m2_or_fixed": {
          const type = document.getElementById("eitherType")?.value;
          if (type === "m2"){
            const area = parseNumber(document.getElementById("eitherArea")?.value);
            const rate = parseNumber(document.getElementById("eitherRate")?.value);
            amount = area * rate * adj;
            details.push(`Área ${area} m² x ${formatBRL(rate)} por m² x ajuste ${pLabel}`);
          } else {
            const val = parseNumber(document.getElementById("eitherFixed")?.value);
            amount = val * adj;
            details.push(`Valor fixo ${formatBRL(val)} x ajuste ${pLabel}`);
          }
          break;
        }
      }

      resultValue.textContent = formatBRL(amount);
      resultPeriod.textContent = currentTax.period || "—";
      resultDetails.textContent = details.join(" • ");
    }

    taxSelect.addEventListener("change", onTaxChange);
    adjustRange.addEventListener("input", updateResult);

    // Init
    populateTaxes();
    taxSelect.value = "iptu";
    onTaxChange();
  });
})();
