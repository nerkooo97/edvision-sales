const fs = require('fs');
const path = require('path');

const localPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).local.json');
const gitPath = path.join(__dirname, '..', 'n8n', 'Kompletan Sales Sistem (ED Vision).json');

function fixWhatsAppFlow(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const wf = JSON.parse(content);

  // 1. Add IF node: 'IF: Spreman za WhatsApp (Prošlo 4 dana)?'
  const ifWhatsAppReadyNode = {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict'
        },
        conditions: [
          {
            id: 'wa-ready-cond-1',
            leftValue: '={{ Boolean($json.is_ready_for_whatsapp) }}',
            rightValue: true,
            operator: {
              type: 'boolean',
              operation: 'equals'
            }
          }
        ],
        combinator: 'and'
      },
      options: {}
    },
    id: 'a9b8c7d6-e5f4-4a3b-2c1d-0e9f8a7b6c5d',
    name: 'IF: Spreman za WhatsApp (Prošlo 4 dana)?1',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [
      -36600,
      18368
    ]
  };

  // Remove if already exists
  wf.nodes = wf.nodes.filter(n => n.name !== 'IF: Spreman za WhatsApp (Prošlo 4 dana)?1');
  wf.nodes.push(ifWhatsAppReadyNode);

  // Connect 'IF: Da li je klijent odgovorio?1' Output 1 (False) -> 'IF: Spreman za WhatsApp (Prošlo 4 dana)?1'
  wf.connections['IF: Da li je klijent odgovorio?1'] = {
    main: [
      [
        {
          node: 'Appwrite: Ažuriraj Lead -> U pregovorima1',
          type: 'main',
          index: 0
        }
      ],
      [
        {
          node: 'IF: Spreman za WhatsApp (Prošlo 4 dana)?1',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  // Connect 'IF: Spreman za WhatsApp (Prošlo 4 dana)?1'
  // Output 0 (True - prošlo 4 dana): -> 'Appwrite: Dohvati Firmu za WhatsApp'
  // Output 1 (False - nije još prošlo 4 dana): -> 'Loop Over Obrađene Kontakte1'
  wf.connections['IF: Spreman za WhatsApp (Prošlo 4 dana)?1'] = {
    main: [
      [
        {
          node: 'Appwrite: Dohvati Firmu za WhatsApp',
          type: 'main',
          index: 0
        }
      ],
      [
        {
          node: 'Loop Over Obrađene Kontakte1',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  fs.writeFileSync(filePath, JSON.stringify(wf, null, 2), 'utf-8');
  console.log(`Successfully fixed WhatsApp follow-up in ${path.basename(filePath)}!`);
}

fixWhatsAppFlow(localPath);
fixWhatsAppFlow(gitPath);
