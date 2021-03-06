const Discord = require('discord.js');
const fs = require('fs');
const steamList = require('../steamAppList.json');

module.exports.run = async (client, message, args, db) => {

  await userWishlistExists(message.author.id);

  let embedResponse = new Discord.MessageEmbed()
  .setColor(8789534)
  .setTitle('Here is a list of all the games I could find that match your search')
  .setDescription('After finding the game you are looking for, you can react with the number corresponding to its number in the list to add the game to your wishlist.');

  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '➡️'];

  const filter = (reaction, user) => emojis.includes(reaction.emoji.name) && user.id === message.author.id;

  let gameToSearch = '';
  let gameCounter = 1;


  for(let i = 0; i < args.length; i++){
    gameToSearch += args[i];
  }
  
  gameToSearch = gameToSearch.toLowerCase();
  gameToSearch = gameToSearch.replace(/[^a-zA-Z0-9]/g, '');



  embedResponse
    

  let currentArrPage = getResponseArray(steamList, gameToSearch);
    
  let pages;
  let currentPage = 1;
  let offset = 0;
  let length = offset + 10;

  if(currentArrPage.length % 10 === 0) {
    pages = Math.floor(currentArrPage.length / 10);
  } else {
    pages = Math.floor(currentArrPage.length / 10) + 1;
  }

  if(currentArrPage.length <= 10) {
    await showEmbed(currentArrPage, emojis, filter);
   } //else {

  //   currentArrPage = getResponseArray(steamList, gameToSearch, offset, length);

  //   showEmbed(currentArrPage, emojis, filter);

  // }

  function userWishlistExists(userID) {
    db.collection('users').doc(userID).get().then(q => {
      if(!q.exists) {
        db.collection('users').doc(userID).set({
          'userID': userID,
          'wishlist': []
        });
      } 
    });
  };

  function addToWishlist(gameToAdd, userID) {
    let userWishlistArr;
    
    db.collection('users').doc(userID).get().then(q => {
      if(q.exists) {
        userWishlistArr = q.data().wishlist;
      }
    }).then(() => {
      userWishlistArr.push(gameToAdd);

      db.collection('users').doc(userID).update({
        'wishlist': userWishlistArr
      });
    });
  }

  function getResponseArray(fullDB, searchedGame, off, len) {

    let responseArr = [];

    for (let i = 0; i < fullDB.apps.length; i++){
  
      let gameDB = String(steamList.apps[i].name);
      gameDB = gameDB.toLowerCase();
      gameDB = gameDB.replace(/[^a-zA-Z0-9]/g, '');
  
      if (gameDB.includes(searchedGame)) {
        responseArr.push(fullDB.apps[i]);
      }
    }

    responseArr.forEach((item) => {
      item.length = item.name.length;
    })

    responseArr.sort(function(a, b){return a.length - b.length});

    if (responseArr.length <= 10) {
      return responseArr;
    } else {
      return responseArr.slice(off, len)
    }
  }

  function showEmbed(arrayToShow, reactionsArr, filterFunction) {
    for (let i = 0; i < arrayToShow.length; i++) {
      embedResponse
        .addFields({
          name: `**${i + 1}**:`, value: `**${arrayToShow[i].name}**\nAppID: ${arrayToShow[i].appid}`, inline: true
        })
    }

    message.channel.send(embedResponse).then(async msg => {
      for(let i = 0; i < arrayToShow.length; i++) {
        await msg.react(reactionsArr[i])
      }

      msg.awaitReactions(filterFunction, {
        max: 1,
        time: 25000,
        errors: ['Time']
      }).then(collected => {

        const reaction = collected.first();

        db.collection('users').doc(message.author.id).get().then(q => {

          const currentWishlist = q.data().wishlist;

          let checkExist = false;

          for(let i = 0; i < arrayToShow.length; i++) {
            for(let x = 0; x < currentWishlist.length; x++) {

              if(arrayToShow[i].appid === currentWishlist[x].appid) {
                checkExist = true;
                break;
              }
            }

            if(reaction.emoji.name === reactionsArr[i]) {

              if(checkExist === true){
                message.reply(`you already have **${arrayToShow[i].name}** in your wishlist!`)
                break;
              } else if(checkExist === false) {
                addToWishlist(arrayToShow[i], message.author.id);
                message.reply(`I have added **${arrayToShow[i].name}** to your wishlist!`)
                break;
              }

            }
          }
        })
      })
    });
  }

}

module.exports.help = {
  name: 'add'
}