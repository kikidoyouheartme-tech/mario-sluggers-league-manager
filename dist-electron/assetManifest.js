"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAPTAIN_PORTRAIT_CROPS = exports.ZIP_ASSET_INVENTORY = void 0;
exports.getCharacterIconCrop = getCharacterIconCrop;
/**
 * Complete inventory of individual PNG files and sprite sheets inside mariosl.zip
 */
exports.ZIP_ASSET_INVENTORY = [
    // 35 Individual Character Portraits (148x125 RGBA)
    { id: 'char_babydaisy', category: 'character_portrait', relativePath: 'mariosl/characters/babydaisy.png', width: 148, height: 125 },
    { id: 'char_babydk', category: 'character_portrait', relativePath: 'mariosl/characters/babydonkeykong.png', width: 148, height: 125 },
    { id: 'char_babyluigi', category: 'character_portrait', relativePath: 'mariosl/characters/babyluigi.png', width: 148, height: 125 },
    { id: 'char_babymario', category: 'character_portrait', relativePath: 'mariosl/characters/babymario.png', width: 148, height: 125 },
    { id: 'char_babypeach', category: 'character_portrait', relativePath: 'mariosl/characters/babypeach.png', width: 148, height: 125 },
    { id: 'char_birdo', category: 'character_portrait', relativePath: 'mariosl/characters/birdo.png', width: 148, height: 125 },
    { id: 'char_blooper', category: 'character_portrait', relativePath: 'mariosl/characters/blooper.png', width: 148, height: 125 },
    { id: 'char_bowser', category: 'character_portrait', relativePath: 'mariosl/characters/bowser.png', width: 148, height: 125 },
    { id: 'char_bowserjr', category: 'character_portrait', relativePath: 'mariosl/characters/bowserjr.png', width: 148, height: 125 },
    { id: 'char_daisy', category: 'character_portrait', relativePath: 'mariosl/characters/daisy.png', width: 148, height: 125 },
    { id: 'char_diddykong', category: 'character_portrait', relativePath: 'mariosl/characters/diddykong.png', width: 148, height: 125 },
    { id: 'char_dixiekong', category: 'character_portrait', relativePath: 'mariosl/characters/dixiekong.png', width: 148, height: 125 },
    { id: 'char_donkeykong', category: 'character_portrait', relativePath: 'mariosl/characters/donkeykong.png', width: 148, height: 125 },
    { id: 'char_drybones_gray', category: 'character_portrait', relativePath: 'mariosl/characters/drybones.png', width: 148, height: 125 },
    { id: 'char_funkykong', category: 'character_portrait', relativePath: 'mariosl/characters/funkykong.png', width: 148, height: 125 },
    { id: 'char_hammerbro', category: 'character_portrait', relativePath: 'mariosl/characters/hammerbro.png', width: 148, height: 125 },
    { id: 'char_kingkrool', category: 'character_portrait', relativePath: 'mariosl/characters/kingkrool.png', width: 148, height: 125 },
    { id: 'char_kritter_green', category: 'character_portrait', relativePath: 'mariosl/characters/kritter.png', width: 148, height: 125 },
    { id: 'char_luigi', category: 'character_portrait', relativePath: 'mariosl/characters/luigi.png', width: 148, height: 125 },
    { id: 'char_magikoopa_blue', category: 'character_portrait', relativePath: 'mariosl/characters/magikoopa.png', width: 148, height: 125 },
    { id: 'char_mario', category: 'character_portrait', relativePath: 'mariosl/characters/mario.png', width: 148, height: 125 },
    { id: 'char_montymole', category: 'character_portrait', relativePath: 'mariosl/characters/montymole.png', width: 148, height: 125 },
    { id: 'char_noki_blue', category: 'character_portrait', relativePath: 'mariosl/characters/noki.png', width: 148, height: 125 },
    { id: 'char_peach', category: 'character_portrait', relativePath: 'mariosl/characters/peach.png', width: 148, height: 125 },
    { id: 'char_peteypiranha', category: 'character_portrait', relativePath: 'mariosl/characters/peteypiranha.png', width: 148, height: 125 },
    { id: 'char_pianta_blue', category: 'character_portrait', relativePath: 'mariosl/characters/pianta.png', width: 148, height: 125 },
    { id: 'char_shyguy_red', category: 'character_portrait', relativePath: 'mariosl/characters/shyguy.png', width: 148, height: 125 },
    { id: 'char_tinykong', category: 'character_portrait', relativePath: 'mariosl/characters/tinykong.png', width: 148, height: 125 },
    { id: 'char_toad_red', category: 'character_portrait', relativePath: 'mariosl/characters/toad.png', width: 148, height: 125 },
    { id: 'char_toadette', category: 'character_portrait', relativePath: 'mariosl/characters/toadette.png', width: 148, height: 125 },
    { id: 'char_toadsworth', category: 'character_portrait', relativePath: 'mariosl/characters/toadsworth.png', width: 148, height: 125 },
    { id: 'char_waluigi', category: 'character_portrait', relativePath: 'mariosl/characters/waluigi.png', width: 148, height: 125 },
    { id: 'char_wario', category: 'character_portrait', relativePath: 'mariosl/characters/wario.png', width: 148, height: 125 },
    { id: 'char_wiggler', category: 'character_portrait', relativePath: 'mariosl/characters/wiggler.png', width: 148, height: 125 },
    { id: 'char_yoshi_green', category: 'character_portrait', relativePath: 'mariosl/characters/yoshi.png', width: 148, height: 125 },
    // 9 Stadium Backgrounds (640x448 RGBA)
    { id: 'stadium_bowsercastle', category: 'stadium_background', relativePath: 'mariosl/stadium/stadiumbackgrounds/bowsercastle.png', width: 640, height: 448 },
    { id: 'stadium_bowserjrplayroom', category: 'stadium_background', relativePath: 'mariosl/stadium/stadiumbackgrounds/bowserjrplayroom.png', width: 640, height: 448 },
    { id: 'stadium_daisycruiser', category: 'stadium_background', relativePath: 'mariosl/stadium/stadiumbackgrounds/daisycruiser.png', width: 640, height: 448 },
    { id: 'stadium_dkjungle', category: 'stadium_background', relativePath: 'mariosl/stadium/stadiumbackgrounds/dkjungle.png', width: 640, height: 448 },
    { id: 'stadium_luigimansion', category: 'stadium_background', relativePath: 'mariosl/stadium/stadiumbackgrounds/luigimansion.png', width: 640, height: 448 },
    { id: 'stadium_mariostadium', category: 'stadium_background', relativePath: 'mariosl/stadium/stadiumbackgrounds/mariostadium.png', width: 640, height: 448 },
    { id: 'stadium_peachicegarden', category: 'stadium_background', relativePath: 'mariosl/stadium/stadiumbackgrounds/peachicegarden.png', width: 640, height: 448 },
    { id: 'stadium_wariocity', category: 'stadium_background', relativePath: 'mariosl/stadium/stadiumbackgrounds/wariocity.png', width: 640, height: 448 },
    { id: 'stadium_yoshipark', category: 'stadium_background', relativePath: 'mariosl/stadium/stadiumbackgrounds/yoshipark.png', width: 640, height: 448 },
    // 5 Sprite Sheets
    { id: 'sheet_captainportraits', category: 'sprite_sheet', relativePath: 'mariosl/characters/captainportraits.png', width: 2047, height: 1554 },
    { id: 'sheet_charactericons', category: 'sprite_sheet', relativePath: 'mariosl/characters/charactericons.png', width: 834, height: 469 },
    { id: 'sheet_teamlogosicons', category: 'sprite_sheet', relativePath: 'mariosl/characters/teamlogosicons.png', width: 617, height: 472 },
    { id: 'sheet_stadiumlogos', category: 'sprite_sheet', relativePath: 'mariosl/stadium/stadiumlogos.png', width: 604, height: 766 },
    { id: 'sheet_titlescreen', category: 'sprite_sheet', relativePath: 'mariosl/ui/titlescreenassets.png', width: 642, height: 1133 }
];
/**
 * Captain Portraits Sprite Sheet Crops (mariosl/characters/captainportraits.png - 2047x1554)
 */
exports.CAPTAIN_PORTRAIT_CROPS = {
    char_mario: { id: 'cap_mario', label: 'Mario Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 1, y: 198, w: 194, h: 231 },
    char_luigi: { id: 'cap_luigi', label: 'Luigi Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 208, y: 198, w: 154, h: 231 },
    char_peach: { id: 'cap_peach', label: 'Peach Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 380, y: 198, w: 164, h: 231 },
    char_daisy: { id: 'cap_daisy', label: 'Daisy Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 557, y: 198, w: 150, h: 231 },
    char_yoshi_green: { id: 'cap_yoshi', label: 'Yoshi Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 722, y: 198, w: 113, h: 231 },
    char_birdo: { id: 'cap_birdo', label: 'Birdo Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 853, y: 198, w: 144, h: 231 },
    char_wario: { id: 'cap_wario', label: 'Wario Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 1017, y: 198, w: 100, h: 231 },
    char_waluigi: { id: 'cap_waluigi', label: 'Waluigi Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 1133, y: 198, w: 110, h: 231 },
    char_donkeykong: { id: 'cap_dk', label: 'Donkey Kong Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 1259, y: 198, w: 168, h: 231 },
    char_diddykong: { id: 'cap_diddy', label: 'Diddy Kong Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 1440, y: 198, w: 139, h: 231 },
    char_bowser: { id: 'cap_bowser', label: 'Bowser Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 1598, y: 198, w: 128, h: 231 },
    char_bowserjr: { id: 'cap_bowserjr', label: 'Bowser Jr. Captain Bust', sheetPath: 'mariosl/characters/captainportraits.png', x: 1741, y: 198, w: 231, h: 231 }
};
/**
 * Helper to compute exact 48x51 pixel crop coordinates in charactericons.png (834x469)
 */
function getCharacterIconCrop(row, col) {
    return {
        id: `icon_r${row}_c${col}`,
        label: `Mini Icon (${row}, ${col})`,
        sheetPath: 'mariosl/characters/charactericons.png',
        x: 1 + col * 49,
        y: 1 + row * 52,
        w: 48,
        h: 51,
        transparentColorHex: '#FFFFFF'
    };
}
