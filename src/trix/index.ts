import puppeteer from 'puppeteer';
import data from './data.json';
import path from 'path';
import ora from 'ora';
import fs from 'fs';

interface IType {
  id: string;
  value: string;
}

interface IProduct {
  name: string;
  description: string;
  price: string;
  categories: string[];
  types: IType[];
  checkboxs: string[];
  cep: string;
  images: string[];
  published: boolean;
}

interface IAccount {
  email: string;
  password: string;
  published: boolean;
}

interface IData {
  products: IProduct[];
  accounts: IAccount[];
}

const urls = {
  auth: 'https://conta.olx.com.br/acesso',
  ad: 'https://www2.olx.com.br/desapega'
}

const accounts = data.accounts.filter(({ published }) => !published);
const ads: IProduct[] = data.products.filter(({ published }) => !published);
const accountIndex = Math.floor(Math.random() * accounts .length);
const account = data.accounts[accountIndex];

(async () => {
  if (accounts.length === 0 || ads.length === 0) {
    console.log('Não há contas disponíveis ou produtos não publicados');
    return;
  }
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(urls.auth, { waitUntil: 'networkidle2' });
  await page.type('[type=email]', account.email, { delay: 10 });
  await page.type('[type="password"]', account.password, { delay: 10 });
  await page.click(".cookie-notice-ok-button");
  await page.click('[type="text"]');
  await page.waitForNavigation({ waitUntil: "networkidle2" });
  await page.waitForTimeout(1500);
  for (let [i, ad] of ads.entries()) {
    const spinner = ora().start(`${ i + 1 } de ${ ads.length }`);
    try {
      await page.goto(urls.ad, { waitUntil: 'networkidle2' });
      await page.type("#input_subject", ad.name, { delay: 10 });
      await page.type("#input_body", ad.description, { delay: 10 });
      for(let category of ad.categories) {
        await page.click(category);
      }
      await page.waitForTimeout(3000);
      for (let type of ad.types) {
        await page.select(type.id, type.value)
      }
      for (let checkbox of ad.checkboxs) {
        await page.click(checkbox)
      }
      const uploadFiles = await page.$('[type="file"]');
      for (const image of ad.images) {
        try {
          await uploadFiles.uploadFile(path.join(__dirname, 'uploads', image));
        } catch (error) {
          console.log(error);
        }
      }
      await page.waitForTimeout(1500);
      await page.type("#price", ad.price, { delay: 10 });
      await page.type("#zipcode", ad.cep, { delay: 10 });
      await page.waitForTimeout(15000);
      await page.click("#ad_insertion_submit_button");
      await page.waitForNavigation({ waitUntil: "networkidle0" });
      const currentAdIndex = ads.findIndex(({ name }) => name === ad.name);
      ads[currentAdIndex].published = true
      fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 2));
      spinner.succeed();
    } catch (error) {
      spinner.fail();
    }
  }
  accounts[accountIndex].published = true;
  fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(data, null, 2));
  await browser.close();
})()