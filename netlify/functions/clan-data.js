// netlify/functions/clan-data.js
exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Método no permitido' })
        };
    }

    try {
        const API_KEY = process.env.COC_API_KEY;
        
        if (!API_KEY) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'API Key no configurada' })
            };
        }

        const { clanTag } = JSON.parse(event.body);
        
        if (!clanTag) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Tag del clan requerido' })
            };
        }

        const cleanTag = clanTag.replace('#', '%23');
        
        const clanResponse = await fetch(`https://api.clashofclans.com/v1/clans/${cleanTag}`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!clanResponse.ok) {
            const errorData = await clanResponse.json().catch(() => ({}));
            return {
                statusCode: clanResponse.status,
                body: JSON.stringify({ 
                    error: errorData.message || 'Error al obtener datos del clan'
                })
            };
        }

        const clanData = await clanResponse.json();

        const membersResponse = await fetch(`https://api.clashofclans.com/v1/clans/${cleanTag}/members`, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            }
        });

        if (!membersResponse.ok) {
            const errorData = await membersResponse.json().catch(() => ({}));
            return {
                statusCode: membersResponse.status,
                body: JSON.stringify({ 
                    error: errorData.message || 'Error al obtener miembros del clan'
                })
            };
        }

        const membersData = await membersResponse.json();

        const totalDonations = membersData.items.reduce((sum, member) => sum + member.donations, 0);
        const totalReceived = membersData.items.reduce((sum, member) => sum + member.donationsReceived, 0);
        
        const leader = membersData.items.find(member => member.role === 'leader');

        const result = {
            name: clanData.name,
            tag: clanData.tag,
            leader: leader ? leader.name : 'N/A',
            donations: totalDonations,
            received: totalReceived,
            members: clanData.members,
            level: clanData.clanLevel,
            lastUpdated: new Date().toISOString()
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Error interno del servidor',
                details: error.message
            })
        };
    }
};
