export const getTimeDescription = (turn: number): string => {
    // Simple cyclic logic for time of day based on turn count
    // Assuming a day cycle of some length, e.g., 20 turns
    const cycle = turn % 24;

    if (cycle >= 5 && cycle < 8) return "朝日がまぶしい";
    if (cycle >= 8 && cycle < 11) return "さわやかな朝";
    if (cycle >= 11 && cycle < 14) return "日が高くなってきた";
    if (cycle >= 14 && cycle < 16) return "穏やかな昼下がり";
    if (cycle >= 16 && cycle < 18) return "日が傾き始めた";
    if (cycle >= 18 && cycle < 20) return "夕焼けが空を染めている";
    if (cycle >= 20 && cycle < 22) return "夜の帳が下りている";
    return "あたりは真っ暗だ"; // 22-24, 0-5
};

export const getHpDescription = (current: number, max: number): string => {
    const percentage = (current / max) * 100;

    if (percentage >= 80) return "元気いっぱいだ！";
    if (percentage >= 60) return "少し疲れが見える";
    if (percentage >= 40) return "息が上がっている";
    if (percentage >= 20) return "フラフラしている";
    if (percentage > 0) return "今にも倒れそうだ...";
    return "意識がない...";
};

export const getMpDescription = (current: number, max: number): string => {
    const percentage = (current / max) * 100;

    if (percentage >= 80) return "精神は充実している";
    if (percentage >= 50) return "集中力は十分だ";
    if (percentage >= 20) return "頭がぼんやりしている";
    if (percentage > 0) return "精神力が枯渇寸前だ";
    return "何も考えられない...";
};
