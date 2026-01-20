use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Deserialize)]
struct CoinMarketCapQuote {
    price: f64,
}

#[derive(Deserialize)]
struct CoinMarketCapQuotes {
    USD: CoinMarketCapQuote,
}

#[derive(Deserialize)]
struct CoinMarketCapAsset {
    quote: CoinMarketCapQuotes,
}

#[derive(Deserialize)]
struct CoinMarketCapResponse {
    data: HashMap<String, CoinMarketCapAsset>,
}

#[tauri::command]
pub async fn test_coinmarketcap(api_key: String) -> Result<f64, String> {
    if api_key.trim().is_empty() {
        return Err("CoinMarketCap API key is required".to_string());
    }

    let client = Client::new();
    let response = client
        .get("https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest")
        .query(&[("symbol", "ETH")])
        .header("X-CMC_PRO_API_KEY", api_key.trim())
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response
            .text()
            .await
            .unwrap_or_else(|_| "Failed to read response body".to_string());
        return Err(format!("CoinMarketCap error {}: {}", status, body));
    }

    let payload: CoinMarketCapResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let price = payload
        .data
        .get("ETH")
        .map(|asset| asset.quote.USD.price)
        .ok_or_else(|| "Price not found in response".to_string())?;

    Ok(price)
}
