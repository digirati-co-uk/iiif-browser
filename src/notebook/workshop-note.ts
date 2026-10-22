import { note, paragraph } from "./story-fixtures";
import { resourceNode } from "./resources";

// Note content from the workshop Markdown supplied with the stories.
const introduction = [
  "The IIIF Manifest Editor provides users with the ability to import an existing manifest and then edit it within the tool, allowing them to develop and enhance their existing IIIF as required. You can share your work in progress, and download and save the Manifest. You can browse published IIIF Collections and Manifests and examine those - perhaps to inform how to structure aspects of the metadata, or see how specific IIIF Presentation specification features have been used by other institutions.",
  "It is a good way to learn and discover more about the possibilities the IIIF Presentation specification can afford. So before we start creating our own manifests - we will take a look at one or two examples of IIIF content so that you can see how they are structured, and view some of the metadata included with them to provide some context for our later work.",
  "Perhaps there are one or more institutions that you are aware of which provide a link to their IIIF Manifests that you would like to select and open? If there are good examples you want to share please do!",
];
const sections: Array<[string, Array<[string, string]>]> = [
  [
    "Bibliothèque nationale de France",
    [
      [
        "https://gallica.bnf.fr/iiif/ark:/12148/btv1b8626777x/manifest.json",
        "La Bible des poëtes, Métamorphose [d'Ovide moralisée par Thomas Walleys et traduite par Colard Mansion]",
      ],
      [
        "https://iiif.biblissima.fr/chateauroux/B360446201_MS0005/manifest.json",
        "Manuscrit reconstitué : Châteauroux, Bibliothèque municipale, ms. 5 (Grandes Chroniques de France)",
      ],
      [
        "https://gallica.bnf.fr/iiif/ark:/12148/btv1b52511281h/manifest.json",
        "BnF. Bibliothèque de l'Arsenal. Ms-1124",
      ],
    ],
  ],
  [
    "University of Leeds",
    [
      [
        "https://iiif.library.leeds.ac.uk/presentation/cc/hbzcdj81",
        'Sketch by Marie Hartley, "The Blacksmith made all the hinges and snecks"',
      ],
      [
        "https://iiif.library.leeds.ac.uk/presentation/cc/fbw7jt45",
        "19th century chromolithographed trade card (advertisement), R. Jaekel trade card",
      ],
      [
        "https://iiif.library.leeds.ac.uk/presentation/cc/mh4cf1hy",
        'Coin collection, "aureus"',
      ],
      [
        "https://presentation-api.dlcs-trial.digirati.io/176/leeds-imc/university-of-leeds-medieval-manuscripts",
        "IIIF Collection with links to a number of Medieval Manuscripts held at Leeds Special Collections",
      ],
    ],
  ],
  [
    "Wellcome",
    [
      ["https://iiif.wellcomecollection.org/presentation/b18035723", "Wunder"],
      [
        "https://iiif.wellcomecollection.org/presentation/collections/archives/MS.1978",
        "Notebook - Marie Curie",
      ],
    ],
  ],
  [
    "British Library",
    [
      [
        "https://bl.digirati.io/iiif/ark:/81055/vdc_100177809527.0x000001",
        "Foundation charter of Bordesley Abbey by Empress Matilda",
      ],
      [
        "https://bl.digirati.io/iiif/ark:/81055/vdc_100104060212.0x000001",
        "Missal ('The Sherborne Missal')",
      ],
      [
        "https://bl.digirati.io/iiif/ark:/81055/vdc_100057739145.0x000001",
        "Jacob van Maerlant, Der naturen bloeme",
      ],
      [
        "https://bl.digirati.io/iiif/ark:/81055/vdc_100101631432.0x000001",
        "Bugis poems",
      ],
      [
        "https://bl.digirati.io/iiif/ark:/81055/vdc_100135827579.0x000001",
        "Yongle dadian 永樂大典, chapters 11903-11904",
      ],
    ],
  ],
  [
    "National Library of Wales - Llyfrgell Genedlaethol Cymru",
    [
      [
        "https://damsssl.llgc.org.uk/iiif/2.0/4628556/manifest.json",
        "The 'Hengwrt Chaucer'",
      ],
      [
        "https://damsssl.llgc.org.uk/iiif/2.0/6160651/manifest.json",
        "Peace Petition - 16/56 1923",
      ],
      [
        "https://damsssl.llgc.org.uk/iiif/2.0/1131490/manifest.json",
        "Aberystwith and Cardigan Bay",
      ],
    ],
  ],
  [
    "Biblioteca Nacional de Portugal",
    [
      [
        "https://permalinkbnd.bnportugal.gov.pt/iiif/13436/manifest",
        "Processionale ad usum sacri ordinis cisterciensis",
      ],
      [
        "https://permalinkbnd.bnportugal.gov.pt/iiif/13517/manifest",
        "[Missal segundo o rito cisterciense]",
      ],
      [
        "https://permalinkbnd.bnportugal.gov.pt/iiif/13934/manifest",
        "[Bíblia]",
      ],
    ],
  ],
  [
    "Leventhal Map & Education Centre, Boston Public Library",
    [
      [
        "https://collections.leventhalmap.org/search/commonwealth:3f462s93b/manifest",
        "A map of New-England",
      ],
      [
        "https://collections.leventhalmap.org/search/commonwealth:3f463966q/manifest",
        "Map of Boston (1874)",
      ],
      [
        "https://collections.leventhalmap.org/search/commonwealth:j6733j16t/manifest",
        "Plan for Boston (1986)",
      ],
    ],
  ],
  [
    "Princeton University Library, Special Collections",
    [
      [
        "https://figgy.princeton.edu/concern/scanned_resources/82b92cb5-7b16-4f15-a8ab-aa505facd65b/manifest",
        "State Turnpike, Historical Photograph Collection",
      ],
      [
        "https://figgy.princeton.edu/concern/scanned_resources/4e2b0909-ce4b-43ad-8a75-85ecfb61b8c1/manifest",
        "The Sid Lapidus '59 Collection and the Age of Reason  / [curator, Steven A. Knowlton].",
      ],
      [
        "https://figgy.princeton.edu/concern/scanned_resources/ccc4a05c-78cc-4dde-9cb4-42fb2d314878/manifest",
        "Albert Einstein in Princeton",
      ],
    ],
  ],
  [
    "University of Edinburgh",
    [
      [
        "https://librarylabs.ed.ac.uk/iiif/manifest/calendars/2016:_Cities_of_the_World.json",
        "Civatates Orbis Terrarum",
      ],
    ],
  ],
  [
    "National Library of Scotland",
    [
      [
        "https://view.nls.uk/manifest/8397/83973981/manifest.json",
        "Lyceum/Royal Lyceum Theatre",
      ],
      [
        "https://view.nls.uk/manifest/7492/74921376/manifest.json",
        "Soviet posters",
      ],
      [
        "https://view.nls.uk/manifest/1334/7515/133475158/manifest.json",
        "15th century English manuscript",
      ],
    ],
  ],
  [
    "Oxford Bodleian",
    [
      [
        "https://iiif.bodleian.ox.ac.uk/iiif/manifest/511601ba-b660-4b07-9b68-8251122c0630.json",
        "Ashmolean Museum Evans Architectural Plans",
      ],
      [
        "https://iiif.bodleian.ox.ac.uk/iiif/manifest/e2e9eea4-e293-4d63-987f-59cfc3d3def9.json",
        "Bodleian Library Animals on Show",
      ],
    ],
  ],
];
export const workshopNote = note(
  "workshop",
  "IIIF Manifest Editor workshop",
  "delft-exhibition",
  [
    ...introduction.map(paragraph),
    {
      type: "heading",
      attrs: { level: 2 },
      content: [
        { type: "text", text: "IIIF Manifest examples to explore today" },
      ],
    },
    paragraph(
      "If you don't have some specific IIIF content that you wish to view, the following is a short list of a some example IIIF Manifests and Collections from various institutes across the globe that can act as a starting point for your exploration:",
    ),
    ...sections.flatMap(([heading, links]) => [
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: heading }],
      },
      {
        type: "bulletList",
        content: links.map(([url, label]) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [
                resourceNode(url, {
                  id: url,
                  source: url,
                  label,
                  type:
                    label.includes("IIIF Collection") ||
                    url.includes("/collections/")
                      ? "Collection"
                      : "Manifest",
                }),
              ],
            },
          ],
        })),
      },
    ]),
  ],
);
