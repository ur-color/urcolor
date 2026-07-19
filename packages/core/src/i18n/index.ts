import type { ChannelTranslations } from "./types";
export type { ChannelTranslations } from "./types";
import en from "./en";
import aa from "./aa";
import ab from "./ab";
import af from "./af";
import ak from "./ak";
import am from "./am";
import ar from "./ar";
import az from "./az";
import bg from "./bg";
import bn from "./bn";
import ca from "./ca";
import cr from "./cr";
import cs from "./cs";
import cy from "./cy";
import da from "./da";
import de from "./de";
import el from "./el";
import es from "./es";
import et from "./et";
import fa from "./fa";
import fi from "./fi";
import fr from "./fr";
import ga from "./ga";
import gu from "./gu";
import he from "./he";
import hi from "./hi";
import hr from "./hr";
import hu from "./hu";
import id from "./id";
import is from "./is";
import it from "./it";
import ja from "./ja";
import ka from "./ka";
import kn from "./kn";
import ko from "./ko";
import lb from "./lb";
import lt from "./lt";
import lv from "./lv";
import mk from "./mk";
import ml from "./ml";
import ms from "./ms";
import my from "./my";
import na from "./na";
import nb from "./nb";
import ne from "./ne";
import nl from "./nl";
import nn from "./nn";
import no from "./no";
import ny from "./ny";
import oc from "./oc";
import pa from "./pa";
import pl from "./pl";
import ps from "./ps";
import pt from "./pt";
import ro from "./ro";
import ru from "./ru";
import si from "./si";
import sk from "./sk";
import sl from "./sl";
import sm from "./sm";
import so from "./so";
import sq from "./sq";
import sr from "./sr";
import su from "./su";
import sv from "./sv";
import ta from "./ta";
import te from "./te";
import th from "./th";
import tl from "./tl";
import tr from "./tr";
import uk from "./uk";
import ur from "./ur";
import vi from "./vi";
import zh from "./zh";
import ja_traditional from "./ja-traditional";
import zh_traditional from "./zh-traditional";
import ko_traditional from "./ko-traditional";

export const translations: Record<string, ChannelTranslations> = {
  en,
  aa,
  ab,
  af,
  ak,
  am,
  ar,
  az,
  bg,
  bn,
  ca,
  cr,
  cs,
  cy,
  da,
  de,
  el,
  es,
  et,
  fa,
  fi,
  fr,
  ga,
  gu,
  he,
  hi,
  hr,
  hu,
  id,
  is,
  it,
  ja,
  ka,
  kn,
  ko,
  lb,
  lt,
  lv,
  mk,
  ml,
  ms,
  my,
  na,
  nb,
  ne,
  nl,
  nn,
  no,
  ny,
  oc,
  pa,
  pl,
  ps,
  pt,
  ro,
  ru,
  si,
  sk,
  sl,
  sm,
  so,
  sq,
  sr,
  su,
  sv,
  ta,
  te,
  th,
  tl,
  tr,
  uk,
  ur,
  vi,
  zh,
  "ja-traditional": ja_traditional,
  "zh-traditional": zh_traditional,
  "ko-traditional": ko_traditional,
};

/**
 * Get a translated channel label for a given locale.
 * Falls back to English if the locale or channel name is not found.
 */
export function getChannelLabel(locale: string, channelName: keyof ChannelTranslations): string {
  const t = translations[locale];
  if (t) return t[channelName];
  return translations.en![channelName];
}
