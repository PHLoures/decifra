"""Gera js/palavras.js a partir da coleção fserb/pt-br (licença MIT).

Uso:
    git clone https://github.com/fserb/pt-br /tmp/pt-br
    python3 ferramentas/gerar_palavras.py /tmp/pt-br

- respostas: as palavras mais comuns do léxico (pela pontuação ICF), sem nomes
  próprios, estrangeirismos, plurais, conjugações soltas e termos ofensivos.
- válidas: tudo o que é aceito como palpite (léxico, conjugações, plurais e
  os femininos que aparecem no corpus).

A ordem das respostas é sorteada uma única vez com semente fixa. Para incluir
palavras novas sem mudar as dos dias já jogados, acrescente-as em EXTRAS: elas
entram no fim da lista.
"""
import random
import re
import sys
import unicodedata
from pathlib import Path

TAMANHO = 5
CORTE = 1659  # quantas palavras mais frequentes entram como candidatas a resposta
SEMENTE = 20261014

# Candidatas frequentes que não servem como resposta do dia
FORA = set("""
estou tinha neste deste desta nesta horas disso jesus nesse maria esses dessa novos serão desse olhos
silva passa nessa deixa cores chega basta torna delas jogue fique artes vindo light águas bruno goiás
penso ceará facto nisso tenta custa valeu login unhas dores ramos micro braga manda altos vasco sousa
bento chico flash tente corre césar media autos volte nunes disto jeans perca moura mouse piauí infra
drive celso anime fiéis ultra bolas leves abreu salve tento fecha júlio ossos tesão marta seios diogo
joana color laura gases mauro green multi meias ervas copos jóias penha chora queen caput corsa chamo
corta fusca stand blues cotas amaro versa luvas beija angra diana milão major bauru valia roque secos
saído modem saias bocas amapá couto simão slide short corra luzia nobel nisto anais ataca ibope judas
netos cache cover prime fogos clean patos grita staff volvo lúcio siena jeová sairá lauro fezes trans
donde blush sedan chupa grill veiga retro anima front apaga paper pisca close remix dante copas pondo
romeu supra timor round dunga bodas tietê cotia monta souto elena piora crato vênus coach xerox fraga
ávila tarso damas match torço gávea morra capão cairo foste toner rimas chica anglo hasta corro mafra
orgia póvoa logos bangu deita lobão sacra aedes teres apolo cruza torce tecto quota táxis canso poupa
bessa apart strip túlio bebes livra araxá barça caicó betão sofra cante hidro relax still rouge logar
alter mixer dobre gibis erica hacer babel vilar romão timer loiça tetra botox ibero error áries tatuí
cuido tróia clama carte rolim gnome choca novel anexa ítalo teima antão cusco célio tesla recta brota
comes parta nitro andas guaçu enfia fôrma basto jumbo grado train urano reich quito trial punha xangô
veras óscar piraí input rabão blast judia devir modus chuta guião vanda marra alana retos recua mento
islão logon creta retém chili ethos trace graal catch corto drops avaré batel cariz frisa coupé rasto
lanço ganga leone finda epóxi molhe mango neuro honor jango parma lomba canas blend suede crush molha
corso jataí ceres tirso tutti tecno rebel copel édipo
negro negra judeu índio
""".split())

# Palavras menos frequentes, mas conhecidas, que também entram como resposta
EXTRAS = """
lince truta vagem cupim dedão adaga carnê jarro broto larva magma fêmur aceno ereto aorta afago polir
rapto canja caqui alado calvo sonar sagaz trufa plebe prumo fedor aipim pequi coeso potro pônei vodca
ralar cervo germe trapo ébano gambá inato banjo dardo platô cacto grude paiol nafta titio jegue bolar
axila tíbia matiz pança carpa húmus lerdo mocho bemol vadio míope latir hidra feudo vedar usura taxar
filão rimar podar rouco pinha vinco bolor apuro tripa lesma viela tonel harém álibi audaz tenaz sépia
chulé ceifa nevar seixo afiar lasca ranço rubor senil vivaz légua coala dália troça musse ilhéu boldo
ameba hiena cuspe ábaco ácaro linfa álamo cidra sifão rédea dúbio pajem vaiar sidra ébrio ungir ogiva
lhama arpão pária jaspe polca silvo igapó fiapo uivar dedal rublo vizir zonzo guizo farpa quepe cílio
fujão
""".split()

LETRAS = re.compile(r"^[a-zà-ÿç]+$")


def sem_acento(p):
    return "".join(c for c in unicodedata.normalize("NFD", p) if unicodedata.category(c) != "Mn")


def linhas(arquivo):
    return [l.strip() for l in arquivo.read_text(encoding="utf8").splitlines() if l.strip()]


def plurais(p):
    saida = []
    if p.endswith("ão"):
        saida += [p[:-2] + "ões", p[:-2] + "ães", p + "s"]
    elif p.endswith("al"):
        saida.append(p[:-2] + "ais")
    elif p.endswith("el"):
        saida += [p[:-2] + "éis", p[:-2] + "eis"]
    elif p.endswith("ol"):
        saida.append(p[:-2] + "óis")
    elif p.endswith("ul"):
        saida.append(p[:-2] + "uis")
    elif p.endswith("il"):
        saida += [p[:-1] + "s", p[:-2] + "eis"]
    elif p.endswith("m"):
        saida.append(p[:-1] + "ns")
    elif p[-1] in "rzs":
        saida.append(p + "es")
    else:
        saida.append(p + "s")
    return saida


def femininos(p):
    if p.endswith("o"):
        return [p[:-1] + "a", p[:-1] + "as"]
    if p.endswith("or"):
        return [p + "a", p + "as"]
    return []


def main(pasta):
    pasta = Path(pasta)
    lexico = [p for p in linhas(pasta / "lexico") if LETRAS.match(p)]
    conjugacoes = [p for p in linhas(pasta / "conjugações") if LETRAS.match(p)]
    icf = {}
    for linha in linhas(pasta / "icf"):
        palavra, _, nota = linha.rpartition(",")
        icf[palavra] = float(nota)
    ofensivas = set(linhas(pasta / "listas" / "negativas"))
    paises = {p.lower() for p in linhas(pasta / "listas" / "paises")}

    def cabe(p):
        return len(sem_acento(p)) == TAMANHO

    lex_set = set(lexico)
    candidatas = sorted(
        (p for p in lex_set if cabe(p) and not re.search("[kwy]", p) and p not in ofensivas and p not in paises),
        key=lambda p: (icf.get(p, 99), p),
    )[:CORTE]
    faltam = [p for p in EXTRAS if p not in lex_set]
    if faltam:
        sys.exit(f"EXTRAS fora do léxico: {faltam}")
    nao_usadas = FORA - set(candidatas)
    if nao_usadas:
        print("aviso: em FORA mas fora do corte:", " ".join(sorted(nao_usadas)), file=sys.stderr)

    # Duas grafias com a mesma chave (sábia/sabiá): fica a mais comum
    unicas = {}
    for p in candidatas:
        if p not in FORA:
            unicas.setdefault(sem_acento(p), p)
    respostas = sorted(unicas.values())
    random.Random(SEMENTE).shuffle(respostas)
    respostas += [p for p in EXTRAS if sem_acento(p) not in unicas]

    validas = {p for p in lexico if cabe(p)} | {p for p in conjugacoes if cabe(p)}
    # Plurais entram sempre; femininos só se aparecem no corpus (evita "carra")
    validas |= {f for p in lexico for f in plurais(p) if cabe(f)}
    validas |= {f for p in lexico for f in femininos(p) if cabe(f) and f in icf}

    # Uma forma escrita por chave sem acento: a da resposta, senão a mais comum
    por_chave = {}
    for p in sorted(validas, key=lambda p: (icf.get(p, 99), p)):
        por_chave.setdefault(sem_acento(p), p)
    for p in respostas:
        por_chave[sem_acento(p)] = p
    validas = sorted(por_chave.values(), key=sem_acento)

    chaves = [sem_acento(p) for p in respostas]
    assert len(set(chaves)) == len(chaves), "resposta repetida"

    destino = Path(__file__).resolve().parent.parent / "js" / "palavras.js"
    destino.write_text(
        "// Gerado por ferramentas/gerar_palavras.py a partir de github.com/fserb/pt-br (MIT, ver LICENSE-palavras.txt).\n"
        "// Não edite à mão: altere o gerador e rode de novo.\n"
        f'window.PALAVRAS = {{\n  respostas: "{" ".join(respostas)}",\n  validas: "{" ".join(validas)}"\n}};\n',
        encoding="utf8",
    )
    print(f"{len(respostas)} respostas, {len(validas)} palavras válidas -> {destino}")


if __name__ == "__main__":
    main(sys.argv[1])
