"""Gera dados/<tamanho>.txt (de 4 a 10 letras) a partir da coleção fserb/pt-br (licença MIT).

Uso:
    git clone https://github.com/fserb/pt-br /tmp/pt-br
    python3 ferramentas/gerar_palavras.py /tmp/pt-br

Cada arquivo tem duas linhas, com palavras separadas por espaço:
  1. respostas: as palavras mais comuns do léxico (pela pontuação ICF), menos as
     listadas em ferramentas/fora.txt, mais as de ferramentas/extras.txt;
  2. válidas: tudo o que é aceito como palpite (léxico, conjugações, plurais e os
     femininos que aparecem no corpus).

A ordem das respostas é sorteada uma única vez com semente fixa. Para incluir
palavras novas sem mudar as dos dias já jogados, use extras.txt: elas entram no
fim da lista.
"""
import random
import re
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
# Quantas palavras mais frequentes de cada tamanho entram como candidatas a resposta
CORTES = {4: 650, 5: 1659, 6: 900, 7: 800, 8: 650, 9: 550, 10: 450}
SEMENTE = 20261014
LETRAS = re.compile(r"^[a-zà-ÿç]+$")


def sem_acento(p):
    return "".join(c for c in unicodedata.normalize("NFD", p) if unicodedata.category(c) != "Mn")


def linhas(arquivo):
    return [l.strip() for l in arquivo.read_text(encoding="utf8").splitlines() if l.strip()]


def secoes(arquivo):
    """Lê um arquivo com seções [tamanho] e devolve {tamanho: [palavras]}."""
    saida, atual = {}, None
    for linha in linhas(arquivo):
        if linha.startswith("#"):
            continue
        m = re.fullmatch(r"\[(\d+)\]", linha)
        if m:
            atual = saida.setdefault(int(m.group(1)), [])
        elif atual is not None:
            atual.extend(linha.split())
    return saida


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
    lex_set = set(lexico)
    conjugacoes = [p for p in linhas(pasta / "conjugações") if LETRAS.match(p)]
    icf = {}
    for linha in linhas(pasta / "icf"):
        palavra, _, nota = linha.rpartition(",")
        icf[palavra] = float(nota)
    ofensivas = set(linhas(pasta / "listas" / "negativas"))
    paises = {p.lower() for p in linhas(pasta / "listas" / "paises")}
    fora = secoes(RAIZ / "ferramentas" / "fora.txt")
    extras = secoes(RAIZ / "ferramentas" / "extras.txt")

    # Formas aceitas como palpite, de todos os tamanhos de uma vez.
    # Plurais entram sempre; femininos só se aparecem no corpus (evita "carra").
    todas = set(lexico) | set(conjugacoes)
    todas |= {f for p in lexico for f in plurais(p)}
    todas |= {f for p in lexico for f in femininos(p) if f in icf}

    destino = RAIZ / "dados"
    destino.mkdir(exist_ok=True)
    for tamanho, corte in CORTES.items():
        def cabe(p):
            return len(sem_acento(p)) == tamanho

        candidatas = sorted(
            (p for p in lex_set if cabe(p) and not re.search("[kwy]", p) and p not in ofensivas and p not in paises),
            key=lambda p: (icf.get(p, 99), p),
        )[:corte]
        fora_tam = set(fora.get(tamanho, []))
        extras_tam = extras.get(tamanho, [])
        faltam = [p for p in extras_tam if p not in lex_set or not cabe(p)]
        if faltam:
            sys.exit(f"extras de {tamanho} letras fora do léxico ou do tamanho: {faltam}")
        sobrando = fora_tam - set(candidatas)
        if sobrando:
            print(f"aviso ({tamanho}): em fora.txt mas fora do corte:", " ".join(sorted(sobrando)), file=sys.stderr)

        # Duas grafias com a mesma chave (sábia/sabiá): fica a mais comum
        unicas = {}
        for p in candidatas:
            if p not in fora_tam:
                unicas.setdefault(sem_acento(p), p)
        respostas = sorted(unicas.values())
        random.Random(SEMENTE if tamanho == 5 else SEMENTE + tamanho).shuffle(respostas)
        respostas += [p for p in extras_tam if sem_acento(p) not in unicas]

        # Uma forma escrita por chave sem acento: a da resposta, senão a mais comum
        por_chave = {}
        for p in sorted((p for p in todas if cabe(p)), key=lambda p: (icf.get(p, 99), p)):
            por_chave.setdefault(sem_acento(p), p)
        for p in respostas:
            por_chave[sem_acento(p)] = p
        validas = sorted(por_chave.values(), key=sem_acento)

        chaves = [sem_acento(p) for p in respostas]
        assert len(set(chaves)) == len(chaves), f"resposta repetida em {tamanho} letras"

        arquivo = destino / f"{tamanho}.txt"
        arquivo.write_text(" ".join(respostas) + "\n" + " ".join(validas) + "\n", encoding="utf8")
        print(f"{tamanho} letras: {len(respostas)} respostas, {len(validas)} válidas -> {arquivo.relative_to(RAIZ)}")


if __name__ == "__main__":
    main(sys.argv[1])
